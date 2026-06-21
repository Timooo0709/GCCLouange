import {
  FS_BASE,
  authHeader,
  checkRest,
  toFsFields,
  fromFsValue,
  type RawDoc,
} from "./setlists";
import type { Report, ReportKind, ReportStatus } from "@/types/report";

function fromFsReport(raw: RawDoc): Report {
  const id = raw.name.split("/").pop()!;
  const data = Object.fromEntries(
    Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)])
  );
  return {
    id,
    kind: (data.kind as ReportKind) ?? "site",
    title: (data.title as string) ?? "",
    description: (data.description as string) ?? "",
    songSlug: (data.songSlug as string) ?? "",
    songTitle: (data.songTitle as string) ?? "",
    pageUrl: (data.pageUrl as string) ?? "",
    status: (data.status as ReportStatus) ?? "pending",
    authorId: (data.authorId as string) ?? "",
    authorName: (data.authorName as string) ?? "",
    authorEmail: (data.authorEmail as string) ?? "",
    createdAt: (data.createdAt as Date | null) ?? null,
  };
}

/** Tous les signalements, les plus récents d'abord (lecture réservée aux admins). */
export async function getReports(): Promise<Report[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "reports" }],
        orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
      },
    }),
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  return rows.filter((r) => r.document).map((r) => fromFsReport(r.document!));
}

export async function setReportStatus(id: string, status: ReportStatus): Promise<void> {
  const headers = await authHeader();
  const docName = `projects/gcclouange/databases/(default)/documents/reports/${id}`;
  const res = await fetch(`${FS_BASE}/reports/${id}?updateMask.fieldPaths=status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ name: docName, fields: toFsFields({ status }) }),
  });
  await checkRest(res);
}

export async function deleteReport(id: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/reports/${id}`, {
    method: "DELETE",
    headers,
  });
  await checkRest(res);
}
