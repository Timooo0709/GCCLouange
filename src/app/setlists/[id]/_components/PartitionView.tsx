import type { SetlistItem } from "@/types/setList";
import type { SongContent } from "@/lib/api/songs";
import { SongView, SectionView, TransitionNote } from "@/components/song/SongView";
import { useTranslation } from "react-i18next";
import { transposeAST } from "@/lib/transposeAST";
import { semitonesTo } from "@/lib/transpose";
import { Link2, MessageSquare } from "lucide-react";
import type { ChordProAST } from "@/types/chordPro";

function TransitionBanner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 py-3 print:py-2">
      <div className="flex-1 border-t border-dashed border-amber-300/60 dark:border-amber-700/40" />
      <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 rounded-xl max-w-lg">
        <MessageSquare className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5 print:hidden" />
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
      <div className="flex-1 border-t border-dashed border-amber-300/60 dark:border-amber-700/40" />
    </div>
  );
}

export function PartitionsView({
  items,
  contents,
  loading,
  showChordsGlobal,
}: {
  items: SetlistItem[];
  contents: Record<string, SongContent>;
  loading: boolean;
  showChordsGlobal: boolean;
}) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="text-sm text-muted-foreground text-center py-16">
        {t("setlists.detail.loadingCharts")}
      </div>
    );
  }
  return (
    <div className="space-y-10 print:space-y-6">
      {[...items].sort((a, b) => a.position - b.position).map((item, idx) => {
        // ── Transition item ──
        if (item.type === "transition") {
          if (!item.transitionText) return null;
          return <TransitionBanner key={`transition-${idx}`} text={item.transitionText} />;
        }

        // ── Fusion item ──
        if (item.type === "fusion" && item.fusionSongs) {
          // Préparer les ASTs transposés par slug
          const transposedAsts: Record<string, ChordProAST> = {};
          for (const fs of item.fusionSongs) {
            const content = contents[fs.songSlug];
            if (!content) continue;
            let ast = content.ast;
            if (fs.keyOverride && fs.keyOverride !== ast.metadata.key) {
              const semitones = semitonesTo(ast.metadata.key, fs.keyOverride);
              ast = transposeAST(ast, semitones, fs.keyOverride);
            }
            transposedAsts[fs.songSlug] = ast;
          }

          // ── Structure mélangée ──
          if (item.mixedStructure && item.mixedStructure.length > 0) {
            return (
              <div key={`fusion-${idx}`} className="print:break-before-page first:print:break-before-auto">
                {/* En-tête fusion */}
                <div className="flex items-center gap-2 mb-2 print:mb-2 pb-3 border-b border-border">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                    {item.position}
                  </span>
                  <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {item.fusionSongs.map((fs) => {
                      const ast = transposedAsts[fs.songSlug];
                      if (!ast) return null;
                      return (
                        <span key={fs.songSlug} className="text-sm font-bold text-foreground">
                          {ast.metadata.title}
                          <span className="ml-1 font-mono text-xs font-normal text-muted-foreground">
                            {fs.keyOverride ?? ast.metadata.key}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Sections en ordre mélangé */}
                <div className="max-w-2xl print:max-w-none pt-2">
                  {item.mixedStructure.map((ms, msIdx) => {
                    const ast = transposedAsts[ms.songSlug];
                    if (!ast) return null;
                    const section = ast.sections.find((s) => s.id === ms.sectionId);
                    if (!section) return null;
                    const fusionSong = item.fusionSongs!.find((fs) => fs.songSlug === ms.songSlug);
                    const sectionNote = ms.note ?? fusionSong?.sectionNotes?.[ms.sectionId];
                    const showSongLabel = item.fusionSongs!.length > 1;
                    return (
                      <div key={`${ms.songSlug}-${ms.sectionId}-${msIdx}`}>
                        <SectionView
                          section={section}
                          language={ast.metadata.language}
                          showChords={showChordsGlobal && item.showChords}
                          showPinyin={ast.metadata.language === "zh"}
                          useJianpu={false}
                          note={sectionNote}
                          songSourceLabel={showSongLabel ? ast.metadata.title : undefined}
                        />
                        {ms.transition && <TransitionNote text={ms.transition} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          // ── Fusion sans structure mélangée : enchaînement en ordre ──
          return (
            <div key={`fusion-${idx}`} className="print:break-before-page first:print:break-before-auto">
              <div className="flex items-center gap-2 mb-4 print:mb-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                  {item.position}
                </span>
                <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs text-primary font-medium uppercase tracking-wider">
                  {t("setlists.form.fusionLabel")}
                </span>
              </div>
              <div className="space-y-8">
                {item.fusionSongs.map((fs, fsIdx) => {
                  const ast = transposedAsts[fs.songSlug];
                  if (!ast) return null;
                  return (
                    <div key={fs.songSlug}>
                      {fsIdx > 0 && (
                        <div className="flex items-center gap-2 my-6 print:my-3">
                          <div className="flex-1 border-t border-dashed border-primary/30" />
                          <Link2 className="h-3 w-3 text-primary/50 shrink-0" />
                          <div className="flex-1 border-t border-dashed border-primary/30" />
                        </div>
                      )}
                      <SongView
                        ast={ast}
                        showChords={showChordsGlobal && item.showChords}
                        showPinyin={ast.metadata.language === "zh"}
                        useJianpu={false}
                        structureOverride={fs.structureOverride}
                        sectionNotes={fs.sectionNotes ?? {}}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        // ── Chant normal ──
        const content = contents[item.songSlug];
        if (!content) return null;

        let ast = content.ast;
        if (item.keyOverride && item.keyOverride !== ast.metadata.key) {
          const semitones = semitonesTo(ast.metadata.key, item.keyOverride);
          ast = transposeAST(ast, semitones, item.keyOverride);
        }

        return (
          <div key={`${item.songSlug}-${idx}`} className="print:break-before-page first:print:break-before-auto">
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
              showChords={showChordsGlobal && item.showChords}
              showPinyin={item.showPinyin}
              useJianpu={false}
              structureOverride={item.structureOverride}
              sectionNotes={item.sectionNotes ?? {}}
              sectionTransitions={item.sectionTransitions ?? {}}
            />
          </div>
        );
      })}
    </div>
  );
}
