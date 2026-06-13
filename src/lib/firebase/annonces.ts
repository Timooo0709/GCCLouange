import {
  FS_BASE,
  authHeader,
  checkRest,
  toFsFields,
  fromFsValue,
  type RawDoc,
} from "./setlists";
import type { Annonce } from "@/types/annonce";

function fromFsAnnonce(raw: RawDoc): Annonce {
  const id = raw.name.split("/").pop()!;
  const data = Object.fromEntries(
    Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)])
  );
  return {
    id,
    section: (data.section as Annonce["section"]) ?? "Culte Francophone",
    title: (data.title as string) ?? "",
    body: (data.body as string) ?? "",
    links: (data.links as Annonce["links"]) ?? [],
    images: (data.images as string[]) ?? [],
    pinned: (data.pinned as boolean) ?? false,
    expiresAt: (data.expiresAt as string | null) ?? null,
    authorId: (data.authorId as string) ?? "",
    authorName: (data.authorName as string) ?? "",
    createdAt: (data.createdAt as Annonce["createdAt"]) ?? null,
  };
}

// Clé localStorage de la dernière visite de la page Annonces (badge « non lu »)
export const ANNONCES_LAST_SEEN_KEY = "annoncesLastSeen";

// Cache partagé (page Annonces + badge non lu de la Navbar)
let cache: Annonce[] | null = null;

export function invalidateAnnonces(): void {
  cache = null;
}

export async function getAnnonces(): Promise<Annonce[]> {
  if (cache) return cache;
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "annonces" }],
        orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
      },
    }),
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  cache = rows.filter((r) => r.document).map((r) => fromFsAnnonce(r.document!));
  return cache;
}

export async function createAnnonce(
  data: Omit<Annonce, "id" | "createdAt">
): Promise<string> {
  const headers = await authHeader();
  const fields = {
    ...toFsFields(data as unknown as Record<string, unknown>),
    createdAt: { timestampValue: new Date().toISOString() },
  };
  const res = await fetch(`${FS_BASE}/annonces`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields }),
  });
  await checkRest(res);
  invalidateAnnonces();
  const doc = (await res.json()) as RawDoc;
  return doc.name.split("/").pop()!;
}

export async function updateAnnonce(
  id: string,
  data: Partial<Omit<Annonce, "id" | "createdAt">>
): Promise<void> {
  const headers = await authHeader();
  const fields = toFsFields(data as Record<string, unknown>);
  const docName = `projects/gcclouange/databases/(default)/documents/annonces/${id}`;
  const mask = Object.keys(data)
    .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join("&");
  const res = await fetch(`${FS_BASE}/annonces/${id}?${mask}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ name: docName, fields }),
  });
  await checkRest(res);
  invalidateAnnonces();
}

export async function deleteAnnonce(id: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/annonces/${id}`, { method: "DELETE", headers });
  await checkRest(res);
  invalidateAnnonces();
}
