"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { MoreHorizontal, Download, Play, Music, Music2, Settings } from "lucide-react";
import { SongView } from "@/components/song/SongView";
import { CustomizePanel, type CustomizeState } from "@/components/customPanel/CustomizePanel";
import type { Song } from "@/types/song";
import { useTranslation } from "react-i18next";
import { pdf } from "@react-pdf/renderer";
import { SongPDF } from "@/components/pdf/SongPDF";
import { extractYouTubeId } from "@/lib/youtube/youtube";
import { buildDefaultStructure } from "@/lib/chordpro/structure";
import { parseChordPro } from "@/lib/chordpro/parser";
import { transposeAST } from "@/lib/transposeAST";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { ALL_KEYS, semitonesTo, getTransposedKey } from "@/lib/transpose";
import { useSearchParams } from "next/navigation";
import type { SectionItem } from "@/types/song";
interface SongDetailClientProps {
  song: Song;
}



  export function SongDetailClient({ song }: SongDetailClientProps) {
    const { t, i18n } = useTranslation();
    const ast = useMemo(() => parseChordPro(song.chordProSource), [song.chordProSource]);
    const isZh = song.language === "zh";
    const originalKey = ast.metadata.key;
    const youtubeId = song.youtubeUrl ? extractYouTubeId(song.youtubeUrl) : null;
    const scrollVisible = useScrollDirection();
    const [showVideo, setShowVideo] = useState(false);
    const [showPanel, setShowPanel] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [backPath, setBackPath] = useState("/songs");
    const [backLabel, setBackLabel] = useState("");
    const searchParams = useSearchParams();
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

    // Mémoriser le chant dans les « récemment consultés » (affichés sur /songs)
    useEffect(() => {
      try {
        const raw = localStorage.getItem("recentSongs");
        const list: string[] = raw ? JSON.parse(raw) : [];
        const next = [song.slug, ...list.filter((s) => s !== song.slug)].slice(0, 8);
        localStorage.setItem("recentSongs", JSON.stringify(next));
      } catch { /* stockage indisponible */ }
    }, [song.slug]);

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


    // Structure override : IDs des sections dans l'ordre choisi
    
    const defaultStructure = useMemo(
      () => customize.structure.map((s) => s.uid),
      [customize.structure]
    );

    const structureOverride = searchParams.get("structure")
      ? JSON.parse(searchParams.get("structure")!)
      : defaultStructure;

    const defaultSectionsNote = Object.fromEntries(
      customize.structure.map((s) => [s.uid, s.note]).filter(([, n]) => n)
    );

    const sectionsNote = searchParams.get("sectionNotes")
      ? JSON.parse(searchParams.get("sectionNotes")!)
      : defaultSectionsNote;

    useEffect(() => {
      const structure: SectionItem[] = structureOverride.map((uid: string, index: number) => {
        const sectionId = uid.replace(/-\d+$/, "");
        const cleanUid = uid.match(/-\d+$/) ? uid : `${sectionId}-${index}`;
        return {
          uid: cleanUid,
          sectionId,
          name: ast.sections.find((s) => s.id === sectionId)?.name,
          note: sectionsNote[cleanUid] ?? sectionsNote[uid] ?? sectionsNote[sectionId] ?? "",
        };
      });
      setCustomize(prev => ({...prev, structure: structure}))
    },[]);

    useEffect(() => {
      const songKey = searchParams.get('key')
        ? JSON.parse(searchParams.get('key')!)
        : originalKey;
      const diff = semitonesTo(originalKey, songKey);
      setCustomize(prev => ({ ...prev, currentKey: songKey, semitones: diff }));
    }, []); // une seule fois au montage

    const displayedAST = useMemo(
      () => transposeAST(ast, customize.semitones, customize.currentKey),
      [ast, customize.semitones, customize.currentKey]
    );

    // Menu ⋯ (médias, personnaliser, PDF)
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      if (!menuOpen) return;
      const handler = (e: MouseEvent | TouchEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setMenuOpen(false);
        }
      };
      document.addEventListener("mousedown", handler);
      document.addEventListener("touchstart", handler);
      return () => {
        document.removeEventListener("mousedown", handler);
        document.removeEventListener("touchstart", handler);
      };
    }, [menuOpen]);

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
            sectionNotes={sectionsNote}
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
        <div className={`print:hidden fixed left-0 right-0 top-[58px] z-10 bg-background/95 backdrop-blur border-b border-border transition-transform duration-300 ${ scrollVisible ? "translate-y-0" : "-translate-y-[calc(100%+58px)]"}`}>
          <div className = "max-w-3xl mx-auto w-full flex flex-wrap gap-0.5 items-center py-2 px-1">
            <Link href={backPath} className="text-sm text-muted-foreground hover:text-foreground mr-1">
              <button className="h-8 px-2.5 rounded-[8px] border border-border bg-card text-muted-foreground hover:text-foreground text-[12.5px] font-semibold flex items-center gap-0.5 transition-all duration-150">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5m6-7l-7 7 7 7" />
                </svg>
                <span className="hidden sm:inline">{t("songs.detail.backToAll")}</span>
              </button>
            </Link>
            {/* Transposition rapide */}
            <div className="flex items-center">
              <button
                onClick={() =>
                  setCustomize((c) => {
                    const s = c.semitones - 1;
                    return { ...c, semitones: s, currentKey: getTransposedKey(originalKey, s) };
                  })
                }
                className="w-8 h-8 rounded border border-border text-xs font-bold hover:bg-muted flex items-center justify-center"
              >
                −
              </button>
                <select
                  value={customize.currentKey}
                  onChange={(e) => setCustomize((c) => {
                    const key = e.target.value;
                    const diff = semitonesTo(originalKey, key);
                    return { ...c, semitones: diff, currentKey: key };
                    })
                  }
                  className="flex-1 px-2 py-1.5 border border-border rounded bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {ALL_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                      {k === originalKey ? " " + t("customize.panel.keyOriginal") : ""}
                    </option>
                  ))}
                </select>
              <button
                onClick={() =>
                  setCustomize((c) => {
                    const s = c.semitones + 1;
                    return { ...c, semitones: s, currentKey: getTransposedKey(originalKey, s) };
                  })
                }
                className="w-8 h-8 rounded border border-border text-xs font-bold hover:bg-muted flex items-center justify-center"
              >
                +
              </button>
            </div>

            <div className="ml-auto flex gap-1.5 items-center justify-end">
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

              {/* Pinyin (chants zh) */}
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

              {/* Menu ⋯ : médias / personnaliser / PDF */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Plus d'actions"
                  className="h-8 w-8 rounded-[8px] border border-border bg-card text-muted-foreground hover:text-foreground flex items-center justify-center transition-all duration-150"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
                    {youtubeId && (
                      <button
                        onClick={() => { setShowVideo((v) => !v); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-foreground hover:bg-muted/50 transition-colors text-left"
                      >
                        <Play className="h-3.5 w-3.5 text-muted-foreground" />
                        {showVideo ? "✕ " + t("songs.detail.video") : t("songs.detail.video")}
                      </button>
                    )}
                    {song.spotifyUrl && (
                      <a href={song.spotifyUrl} target="_blank" rel="noopener noreferrer"
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <Music className="h-3.5 w-3.5 text-muted-foreground" />
                        Spotify
                      </a>
                    )}
                    {song.appleMusicUrl && (
                      <a href={song.appleMusicUrl} target="_blank" rel="noopener noreferrer"
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <Music2 className="h-3.5 w-3.5 text-muted-foreground" />
                        Apple Music
                      </a>
                    )}
                    <button
                      onClick={() => { setShowPanel(true); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-foreground hover:bg-muted/50 transition-colors text-left"
                    >
                      <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                      {t("songs.detail.customize")}
                    </button>
                    <button
                      onClick={async () => { setMenuOpen(false); await handleDownload(); }}
                      disabled={downloading}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 text-left"
                    >
                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                      {downloading ? "…" : t("songs.detail.downloadPdf") || "PDF"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Embed YouTube */}
          
        </div>
        {youtubeId && showVideo && (
            <div className="print:hidden border-b border-border bg-black/5 px-4 py-3 flex justify-center mt-[82px]">
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
        <main className="px-4 py-6 print:px-0 print:py-2 print:max-w-none max-w-2xl mx-auto overflow-x-auto mt-[48px]">
          <SongView
            ast={displayedAST}
            showChords={customize.showChords}
            showPinyin={customize.showPinyin}
            useJianpu={customize.useJianpu}
            structureOverride={structureOverride}
            sectionNotes={sectionsNote}
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
            songTitle={song.title}
          />
        )}

    </div>
    );
  }
