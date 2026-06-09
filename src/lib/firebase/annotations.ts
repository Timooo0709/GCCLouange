import { auth } from "@/lib/firebase/config";

const FS_BASE =
  "https://firestore.googleapis.com/v1/projects/gcclouange/databases/(default)/documents";

async function authHeader(): Promise<Record<string, string>> {
  if (!auth.currentUser) return {};
  const token = await auth.currentUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

function docId(userId: string, setlistId: string, pageKey: string) {
  return `${userId}__${setlistId}__${pageKey}`;
}

export async function loadAnnotation(
  userId: string,
  setlistId: string,
  pageKey: string,
): Promise<string | null> {
  try {
    const headers = await authHeader();
    const id = docId(userId, setlistId, pageKey);
    const res = await fetch(`${FS_BASE}/annotations/${encodeURIComponent(id)}`, { headers });
    if (!res.ok) return null;
    const raw = await res.json();
    return (raw.fields?.data?.stringValue as string) ?? null;
  } catch {
    return null;
  }
}

export async function saveAnnotation(
  userId: string,
  setlistId: string,
  pageKey: string,
  data: string,
): Promise<void> {
  try {
    const headers = await authHeader();
    const id = docId(userId, setlistId, pageKey);
    const encodedId = encodeURIComponent(id);
    const docName = `projects/gcclouange/databases/(default)/documents/annotations/${id}`;
    await fetch(
      `${FS_BASE}/annotations/${encodedId}?updateMask.fieldPaths=data&updateMask.fieldPaths=updatedAt`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          name: docName,
          fields: {
            data: { stringValue: data },
            updatedAt: { timestampValue: new Date().toISOString() },
          },
        }),
      },
    );
  } catch {
    // Annotations are best-effort
  }
}
