"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { SongView } from "@/components/song/SongView";
import { CustomizePanel, type CustomizeState, type SectionItem } from "@/components/song/CustomizePanel";
import { parseChordPro } from "@/lib/chordpro/parser";
import { transposeAST } from "@/lib/transposeAST";
import type { Song } from "@/lib/types";
import { ALL_KEYS, getTransposedKey, semitonesTo } from "@/lib/transpose";
import { useTranslation } from "react-i18next";
import { pdf } from "@react-pdf/renderer";
import { SongPDF } from "@/components/song/SongPDF";

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function buildDefaultStructure(sections: ReturnType<typeof parseChordPro>["sections"]): SectionItem[] {
  return sections.map((s, i) => ({
    uid: `${s.id}-${i}`,
    sectionId: s.id,
    name: s.name || s.type,
    note: "",
  }));
}

interface SongDetailClientProps {
  song: Song;
}

export function SongDetailClient({ song }: SongDetailClientProps) {
  const { t, i18n } = useTranslation();
  const ast = useMemo(() => parseChordPro(song.chordProSource), [song.chordProSource]);
  const isZh = song.language === "zh";
  const originalKey = ast.metadata.key;
  const youtubeId = song.youtubeUrl ? extractYouTubeId(song.youtubeUrl) : null;

  const [showVideo, setShowVideo] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [backPath, setBackPath] = useState("/songs");
  const [backLabel, setBackLabel] = useState("");
  useEffect(() => {
    const saved = sessionStorage.getItem("lastListPath");
    if (saved) {
      setBackPath(saved);
      setBackLabel(saved.startsWith("/setlists/") ? t("setlists.detail.back") : t("songs.detail.backToAll"));
    } else {
      setBackLabel(t("songs.detail.backToAll"));
    }
  }, [t]);

  const [customize, setCustomize] = useState<CustomizeState>({
    semitones: 0,
    currentKey: originalKey,
    showChords: true,
    showPinyin: isZh,
    useJianpu: false,
    structure: buildDefaultStructure(ast.sections),
  });

  // Transpose helpers
  function shiftBy(delta: number) {
    setCustomize((c) => {
      const s = c.semitones + delta;
      return { ...c, semitones: s, currentKey: getTransposedKey(originalKey, s) };
    });
  }

  function setKey(key: string) {
    setCustomize((c) => ({ ...c, semitones: semitonesTo(originalKey, key), currentKey: key }));
  }

  const semitoneLabel = customize.semitones === 0
    ? t("customize.panel.keyOriginal") || "orig."
    : (customize.semitones > 0 ? "+" : "") + customize.semitones;

  const displayedAST = useMemo(
    () => transposeAST(ast, customize.semitones, customize.currentKey),
    [ast, customize.semitones, customize.currentKey]
  );

  const structureOverride = useMemo(
    () => customize.structure.map((s) => s.sectionId),
    [customize.structure]
  );

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await pdf(
        <SongPDF
          ast={displayedAST}
          showChords={customize.showChords}
          showPinyin={customize.showPinyin}
          useJianpu={false}
          structureOverride={structureOverride}
          sectionNotes={Object.fromEntries(
            customize.structure.map((s) => [s.sectionId, s.note]).filter(([, n]) => n)
          )}
          language={i18n.language}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${song.slug}-${customize.currentKey}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen print:min-h-0 bg-background">

      {/* ── Barre de contrôles ── */}
      <div className="print:hidden sticky top-[58px] z-30 bg-background/88 backdrop-blur-[12px] border-b border-border/50">
        <div className="max-w-[1080px] mx-auto px-4">
          <div className="flex items-center gap-2 py-[9px] flex-wrap">

            {/* ← Retour */}
            <Link
              href={backPath}
              className="text-[13px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 mr-1"
            >
              ← <span>{backLabel || t("songs.detail.backToAll")}</span>
            </Link>

            {/* Transpose pill : − [dropdown / ORIG.] + */}
            <div className="flex items-center gap-0 border border-border rounded-[10px] bg-card overflow-hidden">
              <button
                onClick={() => shiftBy(-1)}
                aria-label="−½ ton"
                className="w-7 h-[34px] flex items-center justify-center text-[17px] font-bold text-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
              >
                −
              </button>
              <div className="flex flex-col items-center px-1 min-w-[44px]">
                <div className="relative flex items-center justify-center">
                  <select
                    value={customize.currentKey}
                    onChange={(e) => setKey(e.target.value)}
                    aria-label={t("customize.panel.key")}
                    className="appearance-none bg-transparent font-mono text-[14px] font-bold text-foreground text-center cursor-pointer pr-3 focus:outline-none"
                    style={{ textAlignLast: "center" }}
                  >
                    {ALL_KEYS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                  {/* caret */}
                  <svg className="absolute right-0 pointer-events-none text-muted-foreground" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M6 9l6 6 6-6"/></svg>
                </div>
                <span className="text-[9px] font-semibold text-muted-foreground uppercase leading-none mt-[-1px] tracking-[.04em]">
                  {semitoneLabel}
                </span>
              </div>
              <button
                onClick={() => shiftBy(+1)}
                aria-label="+½ ton"
                className="w-7 h-[34px] flex items-center justify-center text-[17px] font-bold text-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
              >
                +
              </button>
            </div>

            {/* Groupe d'actions — poussé à droite */}
            <div className="ml-auto flex items-center gap-1 flex-wrap justify-end">

              {/* Accords */}
              <button
                onClick={() => setCustomize((c) => ({ ...c, showChords: !c.showChords }))}
                className={`h-8 px-2.5 rounded-[8px] border text-[12.5px] font-semibold flex items-center gap-1.5 transition-all duration-150 ${
                  customize.showChords
                    ? "border-transparent bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M9 18V5l12-2v13"/></svg>
                <span className="hidden sm:inline">{t("songs.detail.chords") || "Accords"}</span>
              </button>

              {/* Pinyin (ZH uniquement) */}
              {isZh && (
                <button
                  onClick={() => setCustomize((c) => ({ ...c, showPinyin: !c.showPinyin }))}
                  className={`h-8 px-2.5 rounded-[8px] border text-[12.5px] font-semibold flex items-center gap-1.5 transition-all duration-150 ${
                    customize.showPinyin
                      ? "border-transparent bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="font-bold">拼</span>
                  <span className="hidden sm:inline">{t("songs.detail.pinyin") || "Pinyin"}</span>
                </button>
              )}

              {/* Vidéo */}
              {youtubeId && (
                <button
                  onClick={() => setShowVideo((v) => !v)}
                  className={`h-8 px-2.5 rounded-[8px] border text-[12.5px] font-semibold flex items-center gap-1.5 transition-all duration-150 ${
                    showVideo
                      ? "border-transparent bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  <span className="hidden sm:inline">{t("songs.detail.video") || "Vidéo"}</span>
                </button>
              )}

              {/* Personnaliser */}
              <button
                onClick={() => setShowPanel(true)}
                className="h-8 px-2.5 rounded-[8px] border border-border bg-card text-muted-foreground hover:text-foreground text-[12.5px] font-semibold flex items-center gap-1.5 transition-all duration-150"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                <span className="hidden sm:inline">{t("songs.detail.customize")}</span>
              </button>

              {/* PDF */}
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="h-8 px-2.5 rounded-[8px] border border-border bg-card text-muted-foreground hover:text-foreground text-[12.5px] font-semibold flex items-center gap-1.5 transition-all duration-150 disabled:opacity-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/></svg>
                <span className="hidden sm:inline">{downloading ? "…" : t("songs.detail.downloadPdf") || "PDF"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Embed YouTube */}
      {youtubeId && showVideo && (
        <div className="print:hidden border-b border-border bg-black/5 px-4 py-3 flex justify-center">
          <div className="w-full max-w-xl aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title={`${song.title} — YouTube`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Contenu */}
      <main className="px-4 py-6 print:px-0 print:py-2 print:max-w-none max-w-2xl mx-auto overflow-x-auto">
        <SongView
          ast={displayedAST}
          showChords={customize.showChords}
          showPinyin={customize.showPinyin}
          useJianpu={false}
          structureOverride={structureOverride}
          sectionNotes={Object.fromEntries(
            customize.structure.map((s) => [s.sectionId, s.note]).filter(([, n]) => n)
          )}
        />
      </main>

      {/* Panneau de personnalisation */}
      {showPanel && (
        <CustomizePanel
          originalKey={originalKey}
          isZh={isZh}
          hasJianpu={false}
          sections={ast.sections}
          state={customize}
          onChange={setCustomize}
          onClose={() => setShowPanel(false)}
          songTitle={song.title}
        />
      )}
    </div>
  );
}
