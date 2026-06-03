"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Trash2, List, Music, Pencil, Eye, EyeOff } from "lucide-react";
import { getSetlist, deleteSetlist, isRestricted, type FSSetlist } from "@/lib/firebase/setlists";
import { useAuth } from "@/lib/firebase/auth";
import { parseChordPro } from "@/lib/chordpro/parser";
import { DarkModeToggle } from "@/components/ui/DarkModeToggle";
import { useTranslation } from "react-i18next";
import type { SongIndexEntry } from "@/types/song";
import type { SetlistItem } from "@/types/setList";
import { formatDate } from "@/lib/utils/formatDate";

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
          <SetlistFullPDF setlist={setlist} contents={allContents} language={i18n.language} />
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
      {/* Top bar */}
      <div className="print:hidden sticky top-14 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-2 flex items-center gap-3 transition-colors duration-200">
        <Link href={backPath} className="text-sm text-muted-foreground hover:text-foreground">
          {t("setlists.detail.backToAll")}
        </Link>

        {/* Vue toggle */}
        <div className="flex gap-0.5 rounded-lg border border-border p-0.5 bg-muted/30">
          <button
            onClick={() => setView("liste")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              view === "liste" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            {t("setlists.detail.tabList")}
          </button>
          <button
            onClick={switchToPartitions}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              view === "partitions" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Music className="h-3.5 w-3.5" />
            {t("setlists.detail.tabCharts")}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <DarkModeToggle />
          <button
            onClick={() => setShowChords((s) => !s)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {showChords ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <Link
            href={`/setlists/${id}/edit`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {downloading ? "…" : "⬇ " + t("songs.detail.downloadPdf")}
          </button>
          {canDelete && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
              {t("setlists.detail.deleteButton")}
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

      <div className="max-w-2xl mx-auto px-4 py-8 print:px-0 print:py-4">
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
