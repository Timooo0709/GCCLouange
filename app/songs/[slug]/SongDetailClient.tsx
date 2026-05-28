"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { SongView } from "@/components/song/SongView";
import { CustomizePanel, type CustomizeState, type SectionItem } from "@/components/song/CustomizePanel";
import { parseChordPro } from "@/lib/chordpro/parser";
import { transposeAST } from "@/lib/transposeAST";
import type { Song } from "@/lib/types";
import { Eye, EyeOff, Settings } from "lucide-react";
import { getTransposedKey } from "@/lib/transpose";
import { DarkModeToggle } from "@/components/DarkModeToggle";
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
      if (saved.startsWith("/setlists/")) {
        setBackLabel(t("setlists.detail.back"));
      } else {
        setBackLabel(t("songs.detail.backToAll"));
      }
    } else {
      setBackLabel(t("songs.detail.backToAll"));
    }
  }, [t]);

  const hasJianpu = song.hasJianpu;

  const [customize, setCustomize] = useState<CustomizeState>({
    semitones: 0,
    currentKey: originalKey,
    showChords: true,
    showPinyin: isZh,
    useJianpu: false,
    structure: buildDefaultStructure(ast.sections),
  });

  // AST transposé en mémoire — recalculé uniquement si semitones change
  const displayedAST = useMemo(
    () => transposeAST(ast, customize.semitones, customize.currentKey),
    [ast, customize.semitones, customize.currentKey]
  );

  // Structure override : IDs des sections dans l'ordre choisi
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
          useJianpu={customize.useJianpu}
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
      {/* Barre de contrôles */}
      <div className="print:hidden sticky top-14 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-2 flex flex-wrap gap-3 items-center transition-colors duration-200">
        <Link href={backPath} className="text-sm text-muted-foreground hover:text-foreground mr-2">
          {backLabel || t("songs.detail.backToAll")}
        </Link>

        {/* Transposition rapide */}
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              setCustomize((c) => {
                const s = c.semitones - 1;
                return { ...c, semitones: s, currentKey: getTransposedKey(originalKey, s) };
              })
            }
            className="w-6 h-6 rounded border border-border text-xs font-bold hover:bg-muted flex items-center justify-center"
          >
            −
          </button>
          <span className="font-mono text-sm font-semibold text-foreground min-w-[2.5rem] text-center">
            {customize.currentKey}
          </span>
          <button
            onClick={() =>
              setCustomize((c) => {
                const s = c.semitones + 1;
                return { ...c, semitones: s, currentKey: getTransposedKey(originalKey, s) };
              })
            }
            className="w-6 h-6 rounded border border-border text-xs font-bold hover:bg-muted flex items-center justify-center"
          >
            +
          </button>
        </div>

        <div className="ml-auto flex flex-wrap gap-2 items-center justify-end">
          <DarkModeToggle />
          {youtubeId && (
            <button
              onClick={() => setShowVideo((v) => !v)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {showVideo ? "✕ " + t("songs.detail.video") : "▶ " + t("songs.detail.video")}
            </button>
          )}
          {song.spotifyUrl && (
            <a href={song.spotifyUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground" title="Spotify">
              ♪ Spotify
            </a>
          )}
          {song.appleMusicUrl && (
            <a href={song.appleMusicUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground" title="Apple Music">
              ♪ Apple Music
            </a>
          )}
          <button
            onClick={() => setCustomize((c) => ({ ...c, showChords: !c.showChords }))}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            title={customize.showChords ? t("customize.panel.hideChords") : t("customize.panel.showChords")}
          >
            {customize.showChords ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span className="hidden sm:inline">
              {customize.showChords ? t("customize.panel.hideChords") : t("customize.panel.showChords")}
            </span>
          </button>
          <button
            onClick={() => setShowPanel(true)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            {t("songs.detail.customize")}
          </button>
          <button onClick={handleDownload} disabled={downloading}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50">
            {downloading ? "…" : "⬇ " + t("songs.detail.downloadPdf")}
          </button>
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
          useJianpu={customize.useJianpu}
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
          hasJianpu={hasJianpu}
          sections={ast.sections}
          state={customize}
          onChange={setCustomize}
          onClose={() => setShowPanel(false)}
        />
      )}
    </div>
  );
}
