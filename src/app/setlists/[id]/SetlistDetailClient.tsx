"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Trash2, List, Music, Pencil } from "lucide-react";
import { getSetlist, deleteSetlist, isRestricted, type FSSetlist } from "@/lib/firebase/setlists";
import { useAuth } from "@/lib/firebase/auth";
import { useTranslation } from "react-i18next";
import type { SongIndexEntry } from "@/types/song";
import type { SetlistItem } from "@/types/setList";
import { formatDate } from "@/lib/utils/formatDate";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { ListView } from "./_components/ListView";
import { PartitionsView } from "./_components/PartitionView";
import { fetchSongAST, type SongContent} from "@/lib/api/songs";
  

// ─── Main component ───────────────────────────────────────────────────────────

export function SetlistDetailClient() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [setlist, setSetlist] = useState<FSSetlist | null>(null);
  const [backPath, setBackPath] = useState("/setlists");

  const scrollVisible = useScrollDirection();
  const [songsMap, setSongsMap] = useState<Record<string, SongIndexEntry>>({});
  const [contents, setContents] = useState<Record<string, SongContent>>({});
  const [loadingSetlist, setLoadingSetlist] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [showChords, setShowChords] = useState(true);
  const [view, setView] = useState<"liste" | "partitions">("liste");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    const saved = sessionStorage.getItem("lastListPath");
    if (saved && (saved.startsWith("/setlists?") || saved === "/setlists")) {
      setBackPath(saved);
    }
    sessionStorage.setItem("lastListPath", window.location.pathname);
  }, []);
  // Load setlist + songs index
  useEffect(() => {
    if (!id) return;
    Promise.all([
      getSetlist(id),
      fetch("/songs-index.json").then((r) => r.json()),
    ]).then(([sl, index]) => {
      setSetlist(sl);
      const map: Record<string, SongIndexEntry> = {};
      for (const s of index.songs ?? []) map[s.slug] = s;
      setSongsMap(map);
    }).finally(() => setLoadingSetlist(false));
  }, [id]);

  // Load full song content when switching to Partitions view
  const loadContents = useCallback(async (items: SetlistItem[]) => {
    setLoadingContent(true);
    const missing = items.filter((item) => !contents[item.songSlug]);
    await Promise.all(
      missing.map(async (item) => {
        const res = await fetchSongAST(item.songSlug);
        if (res) setContents((prev) => ({ ...prev, [item.songSlug]: res }));
      })
    );
    setLoadingContent(false);
  }, [contents]);

  function switchToPartitions() {
    setView("partitions");
    if (setlist) loadContents(setlist.items);
  }

  async function handleDownload() {
    if (!setlist) return;
    setDownloading(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      if (view === "liste") {
        const { SetlistOverviewPDF } = await import("@/components/pdf/SetlistOverviewPDF");
        const blob = await pdf(
          <SetlistOverviewPDF setlist={setlist} songsMap={songsMap} language={i18n.language} />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${setlist.title}-liste.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Fetch any missing song contents inline (don't depend on React state timing)
        const allContents: Record<string, SongContent> = { ...contents };
        await Promise.all(
          setlist.items
            .filter((item) => !allContents[item.songSlug])
            .map(async (item) => {
              try {
                const res = await fetchSongAST(item.songSlug);
                if (res) allContents[item.songSlug] = res;
              } catch { /* skip */ }
            })
        );
        setContents(allContents);
        const { SetlistFullPDF } = await import("@/components/pdf/SetlistFullPDF");
        const blob = await pdf(
          <SetlistFullPDF setlist={setlist} contents={allContents} />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${setlist.title}-partitions.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    if (!setlist) return;
    setDeleting(true);
    try {
      await deleteSetlist(id);
      router.push("/setlists");
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loadingSetlist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!setlist) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">{t("setlists.detail.notFound")}</p>
        <Link href={backPath} className="text-sm text-primary hover:underline">{t("setlists.detail.back")}</Link>
      </div>
    );
  }

  const canDelete = !isRestricted(setlist.category) || !!user;
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar — même style que SongDetailClient */}
      <div className={`{print:hidden fixed left-0 right-0 top-[58px] z-10 bg-background/95 backdrop-blur border-b border-border transition-transform duration-300 ${ scrollVisible ? "translate-y-0" : "-translate-y-[calc(100%+58px)]"}`}>
        <div className="max-w-[1080px] mx-auto px-4">
          <div className="flex items-center gap-2 py-[9px] flex-wrap">

            {/* ← Retour */}
            <Link href={backPath} className="text-[13px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 mr-1">
              <button className="h-8 px-2.5 rounded-[8px] border border-border bg-card text-muted-foreground hover:text-foreground text-[12.5px] font-semibold flex items-center gap-0.5 transition-all duration-150">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5m6-7l-7 7 7 7" />
                </svg>
                <span className="hidden sm:inline">{t("songs.detail.backToAll")}</span>
              </button>
            </Link>

            {/* Vue toggle — pill identique au transpose pill */}
            <div className="flex items-center gap-0 border border-border rounded-[10px] bg-card overflow-hidden">
              <button
                onClick={() => setView("liste")}
                className={`flex items-center gap-1.5 px-3 h-[34px] text-[12.5px] font-semibold transition-colors ${
                  view === "liste" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("setlists.detail.tabList")}</span>
              </button>
              <div className="w-px h-5 bg-border" />
              <button
                onClick={switchToPartitions}
                className={`flex items-center gap-1.5 px-3 h-[34px] text-[12.5px] font-semibold transition-colors ${
                  view === "partitions" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Music className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("setlists.detail.tabCharts")}</span>
              </button>
            </div>

            {/* Actions — poussées à droite */}
            <div className="ml-auto flex items-center gap-1 flex-wrap justify-end">

              {/* Accords */}
              <button
                onClick={() => setShowChords((s) => !s)}
                className={`h-8 px-2.5 rounded-[8px] border text-[12.5px] font-semibold flex items-center gap-1.5 transition-all duration-150 ${
                  showChords
                    ? "border-transparent bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M9 18V5l12-2v13"/></svg>
                <span className="hidden sm:inline">{t("songs.detail.chords")}</span>
              </button>

              {/* Éditer */}
              <Link
                href={`/setlists/${id}/edit`}
                className="h-8 px-2.5 rounded-[8px] border border-border bg-card text-muted-foreground hover:text-foreground text-[12.5px] font-semibold flex items-center gap-1.5 transition-all duration-150"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("setlists.detail.editButton")}</span>
              </Link>

              {/* PDF */}
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="h-8 px-2.5 rounded-[8px] border border-border bg-card text-muted-foreground hover:text-foreground text-[12.5px] font-semibold flex items-center gap-1.5 transition-all duration-150 disabled:opacity-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/></svg>
                <span className="hidden sm:inline">{downloading ? "…" : t("songs.detail.downloadPdf")}</span>
              </button>

              {/* Supprimer */}
              {canDelete && !confirmDelete && (
                <button onClick={() => setConfirmDelete(true)}
                  className="h-8 px-2.5 rounded-[8px] border border-border bg-card text-muted-foreground hover:text-destructive text-[12.5px] font-semibold flex items-center gap-1.5 transition-all duration-150"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("setlists.detail.deleteButton")}</span>
                </button>
              )}
              {confirmDelete && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t("setlists.detail.deleteConfirm")}</span>
                  <button onClick={handleDelete} disabled={deleting}
                    className="text-xs font-medium text-destructive hover:underline disabled:opacity-50">
                    {deleting ? "…" : t("setlists.detail.deleteYes")}
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
                    className="text-xs text-muted-foreground hover:text-foreground">
                    {t("setlists.detail.deleteCancel")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 print:px-0 print:py-4 mt-[54px]">
        {/* Header setlist */}
        <div className="mb-8 pb-5 border-b border-border print:mb-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{setlist.title}</h1>
                {setlist.isDraft && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-800">
                    {t("setlists.list.draft")}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground capitalize mt-1 text-sm">
                {formatDate(setlist.date, i18n.language)}
              </p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground shrink-0 mt-1">
              {t("common.languages." + setlist.language, { defaultValue: setlist.language })}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="px-2 py-0.5 rounded bg-muted text-foreground text-xs">
              {t("categories." + setlist.category, { defaultValue: setlist.category })}
            </span>
            {setlist.leader && (
              <span>{t("setlists.detail.leaderLabel")} <span className="text-foreground">{setlist.leader}</span></span>
            )}
          </div>
          {setlist.notes && (
            <p className="mt-3 text-sm text-muted-foreground italic">{setlist.notes}</p>
          )}
        </div>

        {/* Contenu selon la vue */}
        {view === "liste" ? (
          <ListView items={setlist.items} songsMap={songsMap} />
        ) : (
          <PartitionsView
            items={setlist.items}
            contents={contents}
            loading={loadingContent}
            showChordsGlobal={showChords}
          />
        )}
      </div>
    </div>
  );
}
