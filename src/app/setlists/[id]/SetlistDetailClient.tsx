"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Trash2, List, Music, Pencil, Play, MoreHorizontal, Download, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getSetlist, deleteSetlist, duplicateSetlist, type FSSetlist } from "@/lib/firebase/setlists";
import { useProfile } from "@/lib/firebase/users";
import { canSeeSetlist, canEditSetlist, canDuplicateSetlist } from "@/lib/access";
import { useTranslation } from "react-i18next";
import type { SongIndexEntry } from "@/types/song";
import type { SetlistItem } from "@/types/setList";
import { formatDate } from "@/lib/utils/formatDate";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { ListView } from "./_components/ListView";
import { PartitionsView } from "./_components/PartitionView";
import { fetchSongAST, type SongContent} from "@/lib/api/songs";
import { PerformanceMode } from "@/components/performance/PerformanceMode";
  

// ─── Main component ───────────────────────────────────────────────────────────

export function SetlistDetailClient() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useProfile();
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
  const [performanceMode, setPerformanceMode] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const saved = sessionStorage.getItem("lastListPath");
    if (saved && (saved.startsWith("/setlists?") || saved === "/setlists")) {
      setBackPath(saved);
    }
    sessionStorage.setItem("lastListPath", window.location.pathname);
  }, []);
  // Load setlist + songs index (wait for auth so private setlists get auth headers)
  useEffect(() => {
    if (!id || authLoading) return;
    setLoadError(false);
    setLoadingSetlist(true);
    Promise.all([
      getSetlist(id),
      fetch("/songs-index.json").then((r) => r.json()),
    ]).then(([sl, index]) => {
      setSetlist(sl);
      const map: Record<string, SongIndexEntry> = {};
      for (const s of index.songs ?? []) map[s.slug] = s;
      setSongsMap(map);
    }).catch(() => {
      setLoadError(true);
    }).finally(() => setLoadingSetlist(false));
  }, [id, authLoading, retryKey]);

  // Load full song content when switching to Partitions view
  const loadContents = useCallback(async (items: SetlistItem[]) => {
    setLoadingContent(true);
    const slugsToLoad: string[] = [];
    for (const item of items) {
      if (item.type === "fusion" && item.fusionSongs) {
        for (const fs of item.fusionSongs) {
          if (!contents[fs.songSlug]) slugsToLoad.push(fs.songSlug);
        }
      } else if (item.songSlug && !contents[item.songSlug]) {
        slugsToLoad.push(item.songSlug);
      }
    }
    await Promise.all(
      slugsToLoad.map(async (slug) => {
        const res = await fetchSongAST(slug);
        if (res) setContents((prev) => ({ ...prev, [slug]: res }));
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
        const slugsToFetch: string[] = [];
        for (const item of setlist.items) {
          if (item.type === "fusion" && item.fusionSongs) {
            for (const fs of item.fusionSongs) {
              if (!allContents[fs.songSlug]) slugsToFetch.push(fs.songSlug);
            }
          } else if (item.songSlug && !allContents[item.songSlug]) {
            slugsToFetch.push(item.songSlug);
          }
        }
        await Promise.all(
          slugsToFetch.map(async (slug) => {
            try {
              const res = await fetchSongAST(slug);
              if (res) allContents[slug] = res;
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

  async function handleDuplicate() {
    if (!setlist || !user) return;
    setDuplicating(true);
    try {
      const newId = await duplicateSetlist(
        setlist,
        user.uid,
        `${setlist.title} ${t("setlists.detail.duplicateCopySuffix")}`
      );
      router.push(`/setlists/${newId}/edit`);
    } catch {
      setDuplicating(false);
    }
  }

  function flashFeedback(msg: string) {
    setShareFeedback(msg);
    window.setTimeout(() => setShareFeedback(null), 3000);
  }

  async function handleShare() {
    if (!setlist) return;
    const url = `${window.location.origin}/setlists/${id}`;
    if (setlist.isPrivate) {
      // Le destinataire n'y aura pas accès tant qu'elle est privée
      flashFeedback(t("setlists.detail.sharePrivateWarning"));
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: setlist.title, url });
        return;
      } catch { return; /* partage annulé */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      flashFeedback(t("setlists.detail.linkCopied"));
    } catch { /* clipboard indisponible */ }
  }

  if (loadingSetlist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-muted-foreground">{t("setlists.detail.loginRequired")}</p>
        <Link href={`/login?from=/setlists/${id}`} className="text-sm text-primary hover:underline">
          {t("common.header.login")}
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-muted-foreground">{t("setlists.detail.loadError")}</p>
        <Button variant="outline" onClick={() => setRetryKey((k) => k + 1)}>
          {t("common.retry")}
        </Button>
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

  // Accès : uniquement les setlists de ses services/groupe (ou créées par soi)
  if (!canSeeSetlist(user, profile, setlist)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-muted-foreground">{t("setlists.detail.noAccess")}</p>
        <Link href="/setlists" className="text-sm text-primary hover:underline">{t("setlists.detail.back")}</Link>
      </div>
    );
  }

  // Modification/suppression : créateur + musiciens du même service
  const canEdit = canEditSetlist(user, profile, setlist);
  const canDuplicate = canDuplicateSetlist(user, profile, setlist);
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar — même style que SongDetailClient */}
      <div className={`print:hidden fixed left-0 right-0 top-[var(--nav-h)] z-10 bg-background/95 backdrop-blur border-b border-border transition-transform duration-300 ${ scrollVisible ? "translate-y-0" : "-translate-y-[calc(100%+var(--nav-h))]"}`}>
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
            <div className="ml-auto flex items-center gap-1.5 justify-end">

              {/* Accords (pertinent uniquement en vue partitions) */}
              {view === "partitions" && (
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
              )}

              {/* Mode Louange — action principale en live */}
              <button
                onClick={async () => {
                  // Plein écran natif : à appeler en synchrone dans le geste
                  // utilisateur (avant tout await), sinon la demande est rejetée.
                  // iPhone Safari ne supporte pas l'API → échec silencieux.
                  try {
                    document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
                  } catch { /* non supporté */ }
                  if (setlist && Object.keys(contents).length === 0) {
                    await loadContents(setlist.items);
                  }
                  setPerformanceMode(true);
                }}
                className="h-8 px-3 rounded-[8px] bg-primary text-primary-foreground text-[12.5px] font-semibold flex items-center gap-1.5 hover:bg-primary/90 transition-all duration-150"
              >
                <Play className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("setlists.detail.performanceMode")}</span>
              </button>

              {/* Menu ⋯ : Modifier / Dupliquer / Partager / PDF / Supprimer */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-lg"
                    className="sm:h-8 sm:w-8 rounded-md text-muted-foreground"
                    aria-label={t("common.moreActions")}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {canEdit && (
                    <DropdownMenuItem asChild>
                      <Link href={`/setlists/${id}/edit`}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        {t("setlists.detail.editButton")}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {canDuplicate && (
                    <DropdownMenuItem disabled={duplicating} onClick={() => handleDuplicate()}>
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      {duplicating ? "…" : t("setlists.detail.duplicate")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleShare()}>
                    <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("setlists.detail.share")}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={downloading} onClick={() => handleDownload()}>
                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    {downloading ? "…" : t("songs.detail.downloadPdf")}
                  </DropdownMenuItem>
                  {canEdit && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("setlists.detail.deleteButton")}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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
          {/* Qui peut modifier — rend visible la logique de access.ts */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge variant={canEdit ? "default" : "secondary"}>
              {canEdit ? t("setlists.detail.canEdit") : t("setlists.detail.readOnly")}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {setlist.isPrivate
                ? t("setlists.detail.editableByOwner")
                : t("setlists.detail.editableBy", {
                    category: t("categories." + setlist.category, { defaultValue: setlist.category }),
                  })}
            </span>
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

      {/* Confirmation de suppression */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("setlists.detail.deleteButton")}</AlertDialogTitle>
            <AlertDialogDescription>{t("setlists.detail.deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("setlists.detail.deleteCancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "…" : t("setlists.detail.deleteYes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Retour visuel du partage (lien copié / setlist privée) */}
      {shareFeedback && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-foreground text-background text-sm shadow-lg">
          {shareFeedback}
        </div>
      )}

      {/* Mode Louange */}
      {performanceMode && (
        <PerformanceMode
          items={setlist.items}
          contents={contents}
          initialShowChords={showChords}
          setlistId={id}
          setlistTitle={setlist.title}
          onClose={() => {
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
            setPerformanceMode(false);
          }}
        />
      )}
    </div>
  );
}
