"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2, List, Music, Pencil } from "lucide-react";
import { getSetlist, deleteSetlist, isRestricted, type FSSetlist } from "@/lib/firebase/setlists";
import { useAuth } from "@/lib/firebase/auth";
import { parseChordPro } from "@/lib/chordpro/parser";
import { transposeAST } from "@/lib/transposeAST";
import { semitonesTo } from "@/lib/transpose";
import { SongView } from "@/components/song/SongView";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import type { SongIndexEntry, SetlistItem } from "@/lib/types";
import type { ChordProAST } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SongContent {
  slug: string;
  ast: ChordProAST;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(iso + "T12:00:00"));
}

const LANG_LABEL: Record<string, string> = { fr: "Français", zh: "中文", mixed: "FR / 中文" };

// ─── Vue Liste ────────────────────────────────────────────────────────────────

function ListView({
  items,
  songsMap,
}: {
  items: SetlistItem[];
  songsMap: Record<string, SongIndexEntry>;
}) {
  return (
    <ol className="space-y-3">
      {[...items].sort((a, b) => a.position - b.position).map((item, idx) => {
        const song = songsMap[item.songSlug];
        const displayKey = item.keyOverride ?? song?.originalKey ?? "?";
        const transposed = !!item.keyOverride && item.keyOverride !== song?.originalKey;
        return (
          <li key={`${item.songSlug}-${idx}`} className="flex gap-3 items-start">
            <span className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground mt-0.5">
              {item.position}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <a href={`/songs/${item.songSlug}`}
                  className="font-semibold text-sm text-foreground hover:text-primary">
                  {song?.title ?? item.songSlug}
                </a>
                {song?.titlePinyin && (
                  <span className="text-xs text-muted-foreground">{song.titlePinyin}</span>
                )}
              </div>
              {song?.artist && <p className="text-xs text-muted-foreground">{song.artist}</p>}
              {item.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{item.notes}</p>}
            </div>
            <div className="shrink-0 text-right">
              <span className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${
                transposed ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-foreground"
              }`}>
                {displayKey}
              </span>
              {song?.language === "zh" && (
                <p className="text-[10px] text-muted-foreground mt-0.5">中文</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Vue Partitions ───────────────────────────────────────────────────────────

function PartitionsView({
  items,
  contents,
  loading,
}: {
  items: SetlistItem[];
  contents: Record<string, SongContent>;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="text-sm text-muted-foreground text-center py-16">
        Chargement des partitions…
      </div>
    );
  }

  return (
    <div className="space-y-10 print:space-y-6">
      {[...items].sort((a, b) => a.position - b.position).map((item, idx) => {
        const content = contents[item.songSlug];
        if (!content) return null;

        let ast = content.ast;
        if (item.keyOverride && item.keyOverride !== ast.metadata.key) {
          const semitones = semitonesTo(ast.metadata.key, item.keyOverride);
          ast = transposeAST(ast, semitones, item.keyOverride);
        }

        return (
          <div key={`${item.songSlug}-${idx}`} className="print:break-before-page first:print:break-before-auto">
            {/* Numéro de position */}
            <div className="flex items-center gap-2 mb-3 print:mb-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                {item.position}
              </span>
              {item.notes && (
                <span className="text-xs text-muted-foreground italic">{item.notes}</span>
              )}
            </div>
            <SongView
              ast={ast}
              showChords={item.showChords}
              showPinyin={item.showPinyin}
              useJianpu={false}
              structureOverride={item.structureOverride}
              sectionNotes={item.sectionNotes ?? {}}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SetlistDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [setlist, setSetlist] = useState<FSSetlist | null>(null);
  const [songsMap, setSongsMap] = useState<Record<string, SongIndexEntry>>({});
  const [contents, setContents] = useState<Record<string, SongContent>>({});
  const [loadingSetlist, setLoadingSetlist] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [view, setView] = useState<"liste" | "partitions">("liste");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [downloading, setDownloading] = useState(false);

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
        try {
          const res = await fetch(`/api/songs/${item.songSlug}`);
          if (!res.ok) return;
          const song = await res.json();
          const ast = parseChordPro(song.chordProSource);
          setContents((prev) => ({ ...prev, [item.songSlug]: { slug: item.songSlug, ast } }));
        } catch { /* skip */ }
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
        const { SetlistOverviewPDF } = await import("@/components/song/SetlistOverviewPDF");
        const blob = await pdf(
          <SetlistOverviewPDF setlist={setlist} songsMap={songsMap} />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${setlist.id}-liste.pdf`;
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
                const res = await fetch(`/api/songs/${item.songSlug}`);
                if (!res.ok) return;
                const song = await res.json();
                allContents[item.songSlug] = { slug: item.songSlug, ast: parseChordPro(song.chordProSource) };
              } catch { /* skip */ }
            })
        );
        setContents(allContents);
        const { SetlistFullPDF } = await import("@/components/song/SetlistFullPDF");
        const blob = await pdf(
          <SetlistFullPDF setlist={setlist} contents={allContents} />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${setlist.id}-partitions.pdf`;
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
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!setlist) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Setlist introuvable.</p>
        <a href="/setlists" className="text-sm text-primary hover:underline">← Retour</a>
      </div>
    );
  }

  const canDelete = !isRestricted(setlist.category) || !!user;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="print:hidden sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-2 flex items-center gap-3">
        <a href="/setlists" className="text-sm text-muted-foreground hover:text-foreground">
          ← Setlists
        </a>

        {/* Vue toggle */}
        <div className="flex gap-0.5 rounded-lg border border-border p-0.5 bg-muted/30">
          <button
            onClick={() => setView("liste")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              view === "liste" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Liste
          </button>
          <button
            onClick={switchToPartitions}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              view === "partitions" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Music className="h-3.5 w-3.5" />
            Partitions
          </button>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <DarkModeToggle />
          <a
            href={`/setlists/${id}/edit`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            Modifier
          </a>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {downloading ? "…" : "⬇ PDF"}
          </button>
          {canDelete && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </button>
          )}
          {confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confirmer ?</span>
              <button onClick={handleDelete} disabled={deleting}
                className="text-xs font-medium text-destructive hover:underline disabled:opacity-50">
                {deleting ? "…" : "Oui, supprimer"}
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="text-xs text-muted-foreground hover:text-foreground">
                Annuler
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
                    Brouillon
                  </span>
                )}
              </div>
              <p className="text-muted-foreground capitalize mt-1 text-sm">
                {formatDate(setlist.date)}
              </p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground shrink-0 mt-1">
              {LANG_LABEL[setlist.language] ?? setlist.language}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="px-2 py-0.5 rounded bg-muted text-foreground text-xs">
              {setlist.category}
            </span>
            {setlist.leader && (
              <span>Responsable : <span className="text-foreground">{setlist.leader}</span></span>
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
          />
        )}
      </div>
    </div>
  );
}
