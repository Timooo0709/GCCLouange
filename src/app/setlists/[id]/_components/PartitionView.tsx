import type { SetlistItem } from "@/types/setList";
import type { SongContent } from "@/lib/utils/fetchSongContent";
import { SongView } from "@/components/song/SongView";
import { useTranslation } from "react-i18next";
import { transposeAST } from "@/lib/transposeAST";
import { semitonesTo } from "@/lib/transpose";

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
  console.log('setlist items', items);
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
              showChords={showChordsGlobal && item.showChords}
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