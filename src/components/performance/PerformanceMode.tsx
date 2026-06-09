"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Link2, MessageSquare, ListMusic } from "lucide-react";
import type { PerformanceBlock, SectionBlock, SongHeaderBlock } from "@/lib/performance/blocks";
import { buildPerformanceBlocks, computePageKey } from "@/lib/performance/blocks";
import { SectionView, TransitionNote } from "@/components/song/SongView";
import { AnnotationCanvas, type AnnotationCanvasHandle } from "./AnnotationCanvas";
import { loadAnnotation, saveAnnotation } from "@/lib/firebase/annotations";
import { useAuth } from "@/lib/firebase/auth";
import type { SetlistItem } from "@/types/setList";
import type { SongContent } from "@/lib/utils/fetchSongContent";

// ─── TransitionBanner (local copy — same style as PartitionView) ──────────────

function TransitionBanner({ text }: { text: string }) {
  if (!text) {
    // Empty text = fusion separator
    return (
      <div className="flex items-center gap-2 my-3">
        <div className="flex-1 border-t border-dashed border-primary/30" />
        <Link2 className="h-3 w-3 text-primary/50 shrink-0" />
        <div className="flex-1 border-t border-dashed border-primary/30" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 border-t border-dashed border-amber-300/60 dark:border-amber-700/40" />
      <div className="flex items-start gap-2 px-3 py-2 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 rounded-xl max-w-sm">
        <MessageSquare className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
      <div className="flex-1 border-t border-dashed border-amber-300/60 dark:border-amber-700/40" />
    </div>
  );
}

// ─── BlockRenderer ────────────────────────────────────────────────────────────

function BlockRenderer({
  block,
  showChordsGlobal,
  showTransitions,
}: {
  block: PerformanceBlock;
  showChordsGlobal: boolean;
  showTransitions: boolean;
}) {
  if (block.kind === "song-header") {
    return <SongHeader block={block} />;
  }
  if (block.kind === "transition-intra") {
    if (!showTransitions) return null;
    return <TransitionNote text={block.text} />;
  }
  if (block.kind === "transition-inter") {
    if (!showTransitions) return null;
    return <TransitionBanner text={block.text} />;
  }
  return (
    <SectionView
      section={block.section}
      language={block.language}
      showChords={block.chordsEnabled && showChordsGlobal}
      showPinyin={block.showPinyin}
      useJianpu={false}
      note={block.note}
      songSourceLabel={block.songSourceLabel}
    />
  );
}

const langAccent = (language?: "fr" | "zh") =>
  language === "zh" ? "var(--jianpu-color, #b91c1c)" : "var(--chord-color, #2563eb)";

function SongHeader({ block }: { block: SongHeaderBlock }) {
  if (block.fusionSongs?.length) {
    return (
      <div className="flex items-start gap-2 mb-3 pb-3 border-b border-border">
        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
          {block.position}
        </span>
        <Link2 className="h-3.5 w-3.5 text-primary shrink-0 mt-1" />
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 min-w-0">
          {block.fusionSongs.map((s, i) => (
            <span
              key={i}
              className="text-[17px] font-bold text-foreground leading-tight uppercase tracking-tight"
            >
              {s.title}
              <span
                className="ml-1.5 font-mono text-xs font-normal normal-case"
                style={{ color: langAccent(s.language) }}
              >
                {s.key}
              </span>
            </span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start justify-between gap-4 mb-3 pb-3 border-b border-border">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
            {block.position}
          </span>
          <h2 className="text-[22px] font-bold text-foreground leading-tight uppercase tracking-tight truncate">
            {block.title}
          </h2>
        </div>
        {block.titlePinyin && (
          <p className="text-xs text-muted-foreground mt-0.5 ml-7">{block.titlePinyin}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5 ml-7">{block.artist}</p>
      </div>
      <span className="text-sm font-bold font-mono shrink-0 border-2 rounded-full px-2.5 py-0.5 mt-1"
        style={{ color: langAccent(block.language), borderColor: langAccent(block.language) }}>
        {block.songKey}
      </span>
    </div>
  );
}

// ─── Greedy pagination ────────────────────────────────────────────────────────

// Chaque chant commence sur une nouvelle page (breakBefore = indices des
// en-têtes de chant) ; à l'intérieur d'un chant, remplissage glouton.
function paginateBlocks(heights: number[], viewportH: number, breakBefore: Set<number>): number[][] {
  const pages: number[][] = [];
  let current: number[] = [];
  let used = 0;
  for (let i = 0; i < heights.length; i++) {
    const h = heights[i];
    const mustBreak = breakBefore.has(i) && current.length > 0;
    if (mustBreak || (current.length > 0 && used + h > viewportH)) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(i);
    used += h;
  }
  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

// ─── Main component ───────────────────────────────────────────────────────────

const MIN_SCALE = 0.8;
const MAX_SCALE = 1.5;

export interface PerformanceModeProps {
  items: SetlistItem[];
  contents: Record<string, SongContent>;
  initialShowChords: boolean;
  setlistId: string;
  setlistTitle: string;
  onClose: () => void;
}

export function PerformanceMode({
  items,
  contents,
  initialShowChords,
  setlistId,
  setlistTitle,
  onClose,
}: PerformanceModeProps) {
  const { user } = useAuth();
  const [showChords, setShowChords] = useState(initialShowChords);
  const [showTransitions, setShowTransitions] = useState(true);
  const [annotateMode, setAnnotateMode] = useState(false);
  const [showChrome, setShowChrome] = useState(true);
  const [songListOpen, setSongListOpen] = useState(false);
  const [pages, setPages] = useState<number[][]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [remeasureKey, setRemeasureKey] = useState(0);
  const [fontScale, setFontScale] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem("perf-font-scale") ?? "1");
      return v >= MIN_SCALE && v <= MAX_SCALE ? v : 1;
    } catch {
      return 1;
    }
  });

  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
  const chromeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tapStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const canvasRef = useRef<AnnotationCanvasHandle | null>(null);
  const prevPageKey = useRef<string>("");

  // Build flat block list (memoised — only changes when content changes)
  const blocks = useMemo(
    () => buildPerformanceBlocks(items, contents, true), // always build with chords=true for stable UIDs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, contents],
  );

  // Re-measure when a setting affecting heights changes
  useEffect(() => {
    setRemeasureKey((k) => k + 1);
  }, [showChords, showTransitions, fontScale]);

  // Re-measure on viewport resize / orientation change
  useEffect(() => {
    const onResize = () => setRemeasureKey((k) => k + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Measure block heights → compute pages
  useEffect(() => {
    const run = async () => {
      await document.fonts.ready;
      // py-4 du conteneur de contenu (16px haut + bas, mis à l'échelle par le zoom),
      // plus une marge de sécurité pour la marge haute du 1er bloc d'une page
      // (comptée dans le delta du bloc précédent lors de la mesure).
      const safety = 24 * fontScale;
      const viewportH = window.innerHeight - 32 * fontScale - safety;
      // Hauteur réellement occupée par chaque bloc, marges verticales comprises :
      // delta entre le haut du bloc et le haut du bloc suivant dans le flux.
      const rects = blocks.map((_, i) => blockRefs.current[i]?.getBoundingClientRect() ?? null);
      const heights = rects.map((r, i) => {
        if (!r) return 0;
        const next = rects[i + 1];
        return next ? Math.max(0, next.top - r.top) : r.height;
      });
      const breakBefore = new Set(
        blocks.flatMap((b, i) => (b.kind === "song-header" ? [i] : [])),
      );
      const computed = paginateBlocks(heights, viewportH, breakBefore);
      setPages(computed);
      setCurrentPage((prev) => Math.min(prev, Math.max(0, computed.length - 1)));
    };
    run();
  }, [blocks, remeasureKey, fontScale]);

  const changeFontScale = useCallback((delta: number) => {
    setFontScale((s) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round((s + delta) * 10) / 10));
      try { localStorage.setItem("perf-font-scale", String(next)); } catch { /* privé */ }
      return next;
    });
  }, []);

  // Wake lock
  useEffect(() => {
    type WakeLock = { request: (t: string) => Promise<{ release: () => Promise<void> }> };
    let sentinel: { release: () => Promise<void> } | null = null;
    const acquire = async () => {
      try {
        if ("wakeLock" in navigator) {
          sentinel = await (navigator as unknown as { wakeLock: WakeLock }).wakeLock.request("screen");
        }
      } catch { /* optional feature */ }
    };
    acquire();
    const onVisible = () => { if (document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      sentinel?.release();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Chrome auto-hide (reste visible tant que le mode annotation est actif)
  const annotateModeRef = useRef(annotateMode);
  annotateModeRef.current = annotateMode;

  const showChromeWithTimer = useCallback(() => {
    setShowChrome(true);
    clearTimeout(chromeTimer.current);
    chromeTimer.current = setTimeout(() => {
      if (!annotateModeRef.current) setShowChrome(false);
    }, 3000);
  }, []);

  useEffect(() => {
    showChromeWithTimer();
    return () => clearTimeout(chromeTimer.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (annotateMode) {
      setShowChrome(true);
      clearTimeout(chromeTimer.current);
    } else {
      showChromeWithTimer();
    }
  }, [annotateMode, showChromeWithTimer]);

  // ── Annotation persistence ──────────────────────────────────────────────────

  const currentPageIndices = pages[currentPage] ?? [];
  // Les annotations sont liées à la mise en page : accords, transitions et
  // taille de texte font partie de la clé.
  const layoutSig = `c${showChords ? 1 : 0}t${showTransitions ? 1 : 0}z${Math.round(fontScale * 100)}`;
  const currentPageKey = computePageKey(blocks, currentPageIndices, layoutSig);

  const saveAnnotations = useCallback(async (pgKey: string) => {
    if (!user || !pgKey || !canvasRef.current) return;
    const data = canvasRef.current.getDataURL();
    await saveAnnotation(user.uid, setlistId, pgKey, data);
  }, [user, setlistId]);

  // Load annotations when entering annotate mode or changing page
  useEffect(() => {
    if (!annotateMode || !user || !currentPageKey) return;
    // Small timeout ensures canvas is mounted and ref is set
    const t = setTimeout(async () => {
      const data = await loadAnnotation(user.uid, setlistId, currentPageKey);
      canvasRef.current?.loadDataURL(data ?? "");
    }, 50);
    return () => clearTimeout(t);
  }, [annotateMode, user, setlistId, currentPageKey]);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goToPage = useCallback(async (p: number, pgCount: number) => {
    if (p < 0 || p >= pgCount) return;
    // Save annotations for current page before leaving
    const key = prevPageKey.current;
    if (key) saveAnnotations(key);
    setCurrentPage(p);
  }, [saveAnnotations]);

  useEffect(() => {
    prevPageKey.current = currentPageKey;
  });

  // Keyboard navigation (flèches, PageUp/Down — pédales Bluetooth, Échap pour quitter)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goToPage(currentPage - 1, pages.length);
      } else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        goToPage(currentPage + 1, pages.length);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentPage, pages.length, goToPage, onClose]);

  // Touch/pointer tap handling
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "pen") return;
    tapStart.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "pen" || !tapStart.current) return;
    const dx = e.clientX - tapStart.current.x;
    const dy = e.clientY - tapStart.current.y;
    const dt = Date.now() - tapStart.current.time;
    tapStart.current = null;
    if (Math.abs(dx) > 40 || Math.abs(dy) > 40 || dt > 500) return;

    const third = window.innerWidth / 3;
    if (e.clientX < third) {
      goToPage(currentPage - 1, pages.length);
    } else if (e.clientX > 2 * third) {
      goToPage(currentPage + 1, pages.length);
    } else {
      if (showChrome) {
        setShowChrome(false);
        clearTimeout(chromeTimer.current);
      } else {
        showChromeWithTimer();
      }
    }
  }, [currentPage, pages.length, showChrome, goToPage, showChromeWithTimer]);

  // Current page song info for chrome
  const currentSong = currentPageIndices
    .map((i) => blocks[i])
    .find((b): b is SectionBlock => b.kind === "section");

  // Sommaire : un en-tête de chant par entrée, avec sa page de départ
  const songEntries = useMemo(
    () => blocks.flatMap((b, i) => (b.kind === "song-header" ? [{ block: b, index: i }] : [])),
    [blocks],
  );
  const firstBlockIdx = currentPageIndices[0] ?? 0;
  const currentSongEntryIdx = songEntries.reduce(
    (acc, e, i) => (e.index <= firstBlockIdx ? i : acc),
    0,
  );

  return (
    <div
      className="fixed inset-0 z-[9999] bg-background overflow-hidden select-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {/* ── Hidden measurement container ── */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ opacity: 0, zIndex: -1 }}
        aria-hidden="true"
      >
        <div className="px-6 py-4" style={{ zoom: fontScale }}>
          {blocks.map((block, i) => (
            <div
              key={block.uid}
              ref={(el) => { blockRefs.current[i] = el; }}
            >
              <BlockRenderer
                block={block}
                showChordsGlobal={showChords}
                showTransitions={showTransitions}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="absolute inset-0 overflow-hidden px-6 py-4" style={{ zIndex: 1, zoom: fontScale }}>
        {pages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground animate-pulse">Mise en page…</p>
          </div>
        ) : (
          currentPageIndices.map((i) => (
            <BlockRenderer
              key={blocks[i].uid}
              block={blocks[i]}
              showChordsGlobal={showChords}
              showTransitions={showTransitions}
            />
          ))
        )}
      </div>

      {/* ── Annotation canvas (above content, below chrome) ── */}
      {annotateMode && (
        <AnnotationCanvas
          ref={canvasRef}
          onSave={() => saveAnnotations(currentPageKey)}
        />
      )}

      {/* ── Sommaire des chants ── */}
      {songListOpen && (
        <div
          className="absolute inset-0"
          style={{ zIndex: 30 }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-0 bg-black/30" onClick={() => setSongListOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[80vw] bg-background border-r border-border shadow-xl overflow-y-auto py-3 animate-in slide-in-from-left duration-200">
            <p className="px-4 pb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground truncate">
              {setlistTitle}
            </p>
            {songEntries.map(({ block, index }, i) => {
              const page = pages.findIndex((p) => p.includes(index));
              const isCurrent = i === currentSongEntryIdx;
              return (
                <button
                  key={block.uid}
                  onClick={() => {
                    if (page >= 0) goToPage(page, pages.length);
                    setSongListOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
                    isCurrent ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                    {block.position}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{block.title}</span>
                    {block.titlePinyin && (
                      <span className="block text-[11px] text-muted-foreground truncate">{block.titlePinyin}</span>
                    )}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground shrink-0">{block.songKey}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Chrome (auto-hide overlay) ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{ opacity: showChrome ? 1 : 0, zIndex: 20 }}
        aria-hidden={!showChrome}
      >
        {/* Top bar */}
        <div
          className="absolute top-0 left-0 right-0 pointer-events-auto bg-background/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">
              {currentSong?.songTitle ?? setlistTitle}
            </p>
            {currentSong?.songKey && (
              <p className="text-xs text-muted-foreground font-mono leading-tight mt-0.5">
                {currentSong.songKey}
              </p>
            )}
          </div>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {pages.length > 0 ? `${currentPage + 1} / ${pages.length}` : "—"}
          </span>
        </div>

        {/* Bottom bar */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-auto bg-background/90 backdrop-blur-md border-t border-border px-3 py-2.5 flex items-center gap-1.5 flex-wrap"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          {/* Sommaire des chants */}
          <button
            onClick={() => setSongListOpen(true)}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground active:bg-muted"
            aria-label="Liste des chants"
          >
            <ListMusic className="h-4 w-4" />
          </button>

          {/* Toggle accords */}
          <ChromeBtn
            active={showChords}
            onClick={() => setShowChords((v) => !v)}
          >
            Accords
          </ChromeBtn>

          {/* Toggle transitions */}
          <ChromeBtn
            active={showTransitions}
            onClick={() => setShowTransitions((v) => !v)}
          >
            Transitions
          </ChromeBtn>

          {/* Annoter (stylet — only shown when logged in) */}
          {user && (
            <ChromeBtn
              active={annotateMode}
              onClick={() => setAnnotateMode((v) => !v)}
              accent="amber"
            >
              Annoter
            </ChromeBtn>
          )}

          {/* Taille du texte */}
          <div className="flex items-center">
            <button
              onClick={() => changeFontScale(-0.1)}
              disabled={fontScale <= MIN_SCALE}
              className="h-8 w-8 flex items-center justify-center rounded-l-lg border border-border text-muted-foreground disabled:opacity-30 hover:text-foreground active:bg-muted text-[11px] font-bold"
              aria-label="Réduire le texte"
            >
              A−
            </button>
            <button
              onClick={() => changeFontScale(0.1)}
              disabled={fontScale >= MAX_SCALE}
              className="h-8 w-8 flex items-center justify-center rounded-r-lg border border-l-0 border-border text-muted-foreground disabled:opacity-30 hover:text-foreground active:bg-muted text-[13px] font-bold"
              aria-label="Agrandir le texte"
            >
              A+
            </button>
          </div>

          {/* Spacer + navigation arrows */}
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => goToPage(currentPage - 1, pages.length)}
              disabled={currentPage === 0}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-30 hover:text-foreground active:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => goToPage(currentPage + 1, pages.length)}
              disabled={currentPage >= pages.length - 1}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-30 hover:text-foreground active:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Quitter */}
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground active:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Small chrome button ──────────────────────────────────────────────────────

function ChromeBtn({
  active,
  accent = "primary",
  onClick,
  children,
}: {
  active: boolean;
  accent?: "primary" | "amber";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeClass =
    accent === "amber"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent"
      : "bg-primary/10 text-primary border-transparent";

  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 rounded-lg border text-xs font-semibold transition-colors ${
        active ? activeClass : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
