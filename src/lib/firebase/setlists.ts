import { Timestamp } from "firebase/firestore";
import { auth } from "@/lib/firebase/config";
import type { SetlistItem } from "@/types/setList";

// ─── Categories ───────────────────────────────────────────────────────────────

export const RESTRICTED_CATEGORIES = [
  "Culte Francophone",
  "Intergroupe",
  "Interfranco",
  "Campus",
] as const;

export const FREE_CATEGORIES = [
  "Groupe Paix",
  "Groupe Fidélité",
  "Groupe Bonté",
  "中班",
  "大班",
  "高班",
] as const;

export const ALL_CATEGORIES = [...RESTRICTED_CATEGORIES, ...FREE_CATEGORIES];

export function isRestricted(category: string): boolean {
  return (RESTRICTED_CATEGORIES as readonly string[]).includes(category);
}

// ─── Firestore types ──────────────────────────────────────────────────────────

export interface FSSetlist {
  id: string;
  title: string;
  leader: string;
  category: string;
  date: string;
  language: "fr" | "zh" | "mixed";
  notes: string;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
  items: SetlistItem[];
  isDraft?: boolean;
  isPrivate?: boolean;
  ownerId?: string | null;
}

// ─── Firestore REST API ───────────────────────────────────────────────────────
// Using the REST API instead of the Firebase SDK to avoid WebChannel
// connectivity issues in certain browser environments.

export const FS_BASE = "https://firestore.googleapis.com/v1/projects/gcclouange/databases/(default)/documents";

export async function authHeader(): Promise<Record<string, string>> {
  if (!auth.currentUser) return {};
  const token = await auth.currentUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

// ─── Value conversion: JS → Firestore REST ────────────────────────────────────

function toFsValue(v: unknown): unknown {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFsValue) } };
  if (typeof v === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, toFsValue(val)])
        ),
      },
    };
  }
  return { nullValue: null };
}

export function toFsFields(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toFsValue(v)]));
}

// ─── Value conversion: Firestore REST → JS ────────────────────────────────────

export function fromFsValue(v: unknown): unknown {
  if (typeof v !== "object" || v === null) return null;
  const val = v as Record<string, unknown>;
  if ("nullValue" in val) return null;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return parseInt(val.integerValue as string, 10);
  if ("doubleValue" in val) return val.doubleValue;
  if ("stringValue" in val) return val.stringValue;
  if ("timestampValue" in val) {
    return Timestamp.fromDate(new Date(val.timestampValue as string));
  }
  if ("arrayValue" in val) {
    const arr = val.arrayValue as { values?: unknown[] };
    return (arr.values ?? []).map(fromFsValue);
  }
  if ("mapValue" in val) {
    const map = val.mapValue as { fields?: Record<string, unknown> };
    return Object.fromEntries(
      Object.entries(map.fields ?? {}).map(([k, v2]) => [k, fromFsValue(v2)])
    );
  }
  return null;
}

export type RawDoc = { name: string; fields: Record<string, unknown> };

function fromFsDoc(raw: RawDoc): FSSetlist {
  const id = raw.name.split("/").pop()!;
  const data = Object.fromEntries(
    Object.entries(raw.fields).map(([k, v]) => [k, fromFsValue(v)])
  );
  return { id, ...data } as FSSetlist;
}

export async function checkRest(res: Response): Promise<void> {
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      (json as { error?: { message?: string } }).error?.message ??
        `Erreur Firestore (HTTP ${res.status})`
    );
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getSetlists(): Promise<FSSetlist[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "setlists" }],
        orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
      },
    }),
  });
  if (!res.ok) return [];
  const rows = await res.json() as Array<{ document?: RawDoc }>;
  return rows
    .filter((r) => r.document)
    .map((r) => fromFsDoc(r.document!))
    .filter((s) => !s.isPrivate && !s.isDraft);
}

export async function getMySetlists(uid: string): Promise<FSSetlist[]> {
  const headers = await authHeader();
  // No orderBy to avoid requiring a composite index on (ownerId, createdAt).
  // Sorting is done client-side instead.
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "setlists" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "ownerId" },
            op: "EQUAL",
            value: { stringValue: uid },
          },
        },
      },
    }),
  });
  if (!res.ok) return [];
  const rows = await res.json() as Array<{ document?: RawDoc }>;
  return rows
    .filter((r) => r.document)
    .map((r) => fromFsDoc(r.document!))
    .filter((s) => s.isPrivate === true && !s.isDraft)
    .sort((a, b) => {
      const aTs = a.createdAt?.toMillis() ?? 0;
      const bTs = b.createdAt?.toMillis() ?? 0;
      return bTs - aTs;
    });
}

export async function getSetlist(id: string): Promise<FSSetlist | null> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/setlists/${id}`, { headers });
  // 404 = inexistante, 403 = accès refusé par les rules (setlist privée d'un
  // autre) → null. Toute autre erreur (réseau, 5xx) est levée pour que
  // l'appelant puisse proposer de réessayer au lieu d'afficher « introuvable ».
  if (res.status === 404 || res.status === 403) return null;
  await checkRest(res);
  const raw = await res.json() as RawDoc;
  return fromFsDoc(raw);
}

export async function createSetlist(
  data: Omit<FSSetlist, "id" | "createdAt">
): Promise<string> {
  const headers = await authHeader();
  const fields = {
    ...toFsFields(data as Record<string, unknown>),
    createdAt: { timestampValue: new Date().toISOString() },
  };

  const res = await withTimeout(
    fetch(`${FS_BASE}/setlists`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ fields }),
    }),
    20_000,
    "Délai dépassé — vérifie ta connexion internet et réessaie."
  );

  await checkRest(res);
  const doc = await res.json() as RawDoc;
  return doc.name.split("/").pop()!;
}

export async function updateSetlist(
  id: string,
  data: Partial<Omit<FSSetlist, "id" | "createdAt">>
): Promise<void> {
  const headers = await authHeader();
  const fields = {
    ...toFsFields(data as Record<string, unknown>),
    updatedAt: { timestampValue: new Date().toISOString() },
  };
  const docName = `projects/gcclouange/databases/(default)/documents/setlists/${id}`;
  const mask = [...Object.keys(data), "updatedAt"]
    .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join("&");
  const res = await withTimeout(
    fetch(`${FS_BASE}/setlists/${id}?${mask}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ name: docName, fields }),
    }),
    20_000,
    "Délai dépassé — vérifie ta connexion internet et réessaie."
  );

  await checkRest(res);
}

export async function deleteSetlist(id: string): Promise<void> {
  const headers = await authHeader();
  await fetch(`${FS_BASE}/setlists/${id}`, { method: "DELETE", headers });
}

/** Duplique une setlist en copie privée appartenant au duplicateur.
 *  Il peut ensuite la republier via l'édition (isPrivate → false). */
export async function duplicateSetlist(
  source: FSSetlist,
  uid: string,
  title: string
): Promise<string> {
  return createSetlist({
    title,
    leader: source.leader,
    category: source.category,
    date: source.date,
    language: source.language,
    notes: source.notes,
    items: source.items,
    isDraft: false,
    isPrivate: true,
    ownerId: uid,
  });
}
