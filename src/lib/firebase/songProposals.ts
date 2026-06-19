import {
  FS_BASE,
  authHeader,
  checkRest,
  toFsFields,
  fromFsValue,
  type RawDoc,
} from "./setlists";
import type { SongProposal, SongProposalStatus } from "@/types/songProposal";

function fromFsProposal(raw: RawDoc): SongProposal {
  const id = raw.name.split("/").pop()!;
  const data = Object.fromEntries(
    Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)])
  );
  return {
    id,
    title: (data.title as string) ?? "",
    youtubeUrl: (data.youtubeUrl as string) ?? "",
    pdfUrl: (data.pdfUrl as string) ?? "",
    status: (data.status as SongProposalStatus) ?? "pending",
    authorId: (data.authorId as string) ?? "",
    authorName: (data.authorName as string) ?? "",
    createdAt: (data.createdAt as Date | null) ?? null,
  };
}

/** Toutes les propositions, les plus récentes d'abord (lecture réservée aux admins). */
export async function getSongProposals(): Promise<SongProposal[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "songProposals" }],
        orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
      },
    }),
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  return rows.filter((r) => r.document).map((r) => fromFsProposal(r.document!));
}

export async function createSongProposal(
  data: Pick<SongProposal, "title" | "youtubeUrl" | "pdfUrl" | "authorId" | "authorName">
): Promise<string> {
  const headers = await authHeader();
  const fields = {
    ...toFsFields({ ...data, status: "pending" satisfies SongProposalStatus }),
    createdAt: { timestampValue: new Date().toISOString() },
  };
  const res = await fetch(`${FS_BASE}/songProposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields }),
  });
  await checkRest(res);
  const doc = (await res.json()) as RawDoc;
  return doc.name.split("/").pop()!;
}

export async function setProposalStatus(
  id: string,
  status: SongProposalStatus
): Promise<void> {
  const headers = await authHeader();
  const docName = `projects/gcclouange/databases/(default)/documents/songProposals/${id}`;
  const res = await fetch(
    `${FS_BASE}/songProposals/${id}?updateMask.fieldPaths=status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ name: docName, fields: toFsFields({ status }) }),
    }
  );
  await checkRest(res);
}

export async function deleteSongProposal(id: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/songProposals/${id}`, {
    method: "DELETE",
    headers,
  });
  await checkRest(res);
}
