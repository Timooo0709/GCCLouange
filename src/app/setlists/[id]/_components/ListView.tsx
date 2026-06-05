import type { SetlistItem } from "@/types/setList";
import type { SongIndexEntry } from "@/types/song";
import { useTranslation } from "react-i18next";
import { formatSectionName } from "@/lib/chordpro/parser";
import Link from "next/link";

export function ListView({
  items,
  songsMap,
}: {
  items: SetlistItem[];
  songsMap: Record<string, SongIndexEntry>;
}) {
  const { t } = useTranslation();
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
                <Link href={`/songs/${item.songSlug}`}
                  className="font-semibold text-sm text-foreground hover:text-primary">
                  {song?.title ?? item.songSlug}
                </Link>
                {song?.titlePinyin && (
                  <span className="text-xs text-muted-foreground">{song.titlePinyin}</span>
                )}
              </div>
              {song?.artist && <p className="text-xs text-muted-foreground">{song.artist}</p>}
              {song?.sections && song.sections.length > 0 && (() => {
                const names = item.structureOverride
                  ? item.structureOverride.map((id) => {
                      const s = song.sections!.find((sec) => sec.id === id.replace(/-\d+$/,''));
                      return s ? formatSectionName(s, t) : id;
                    })
                  : song.sections.map((s) => formatSectionName(s, t));
                return (
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-tight">
                    {names.join(" · ")}
                  </p>
                );
              })()}
              {item.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{item.notes}</p>}
            </div>
            <div className="shrink-0 text-right">
              <span className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${
                transposed ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-foreground"
              }`}>
                {displayKey}
              </span>
              {song?.language === "zh" && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{t("common.languages.zh")}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
