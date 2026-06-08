import { useState } from "react";
import type { SetlistItem } from "@/types/setList";
import type { SongIndexEntry } from "@/types/song";
import { useTranslation } from "react-i18next";
import { formatSectionName } from "@/lib/chordpro/parser";
import Link from "next/link";
import { Link2, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

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
        // ── Transition item ──
        if (item.type === "transition") {
          return <TransitionListItem key={`transition-${idx}`} item={item} />;
        }

        // ── Fusion item ──
        if (item.type === "fusion" && item.fusionSongs) {
          return (
            <li key={`fusion-${idx}`} className="flex gap-3 items-start">
              <span className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground mt-0.5">
                {item.position}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="font-semibold text-sm text-foreground">
                    {item.fusionSongs
                      .map((fs) => songsMap[fs.songSlug]?.title ?? fs.songSlug)
                      .join(" / ")}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-primary font-medium px-1.5 py-0.5 bg-primary/10 rounded">
                    {t("setlists.form.fusionLabel")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  {item.fusionSongs.map((fs) => {
                    const song = songsMap[fs.songSlug];
                    const displayKey = fs.keyOverride ?? song?.originalKey ?? "?";
                    const transposed = !!fs.keyOverride && fs.keyOverride !== song?.originalKey;
                    return (
                      <span key={fs.songSlug} className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
                        <Link href={`/songs/${fs.songSlug}`} className="hover:text-primary hover:underline">
                          {song?.title ?? fs.songSlug}
                        </Link>
                        <span className={`font-mono text-[10px] px-1 py-0.5 rounded ${
                          transposed
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-muted text-foreground"
                        }`}>
                          {displayKey}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </li>
          );
        }

        // ── Regular song item ──
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
                <Link href={{
                  pathname:`/songs/${item.songSlug}`,
                  query: {
                    ...(item.structureOverride && {
                      structure: JSON.stringify(item.structureOverride),
                    }),
                    ...(item.sectionNotes && {
                      sectionNotes: JSON.stringify(item.sectionNotes),
                    }),
                    ...(item.keyOverride && {
                      key: JSON.stringify(item.keyOverride)
                    })
                  },
                }}
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

function TransitionListItem({ item }: { item: SetlistItem }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  if (!item.transitionText) return null;
  return (
    <li className="flex gap-3 items-start">
      <span className="shrink-0 w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mt-0.5">
        <MessageSquare className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
      </span>
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide hover:opacity-80 transition-opacity"
        >
          {t("setlists.form.transitionLabel", { defaultValue: "Transition" })}
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {open && (
          <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{item.transitionText}</p>
        )}
      </div>
    </li>
  );
}
