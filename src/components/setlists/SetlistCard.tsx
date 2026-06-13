"use client";

import Link from "next/link";
import { type FSSetlist } from "@/lib/firebase/setlists";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/utils/formatDate";
import { categoryColor } from "@/lib/serviceColors";

export function SetlistCard({ setlist }: { setlist: FSSetlist }) {
  const { t, i18n } = useTranslation();
  const color = categoryColor(setlist.category);

  return (
    <Link
      href={`/setlists/${setlist.id}`}
      className="flex flex-col justify-between rounded-xl border border-border border-l-4 bg-background hover:bg-muted/30 hover:border-primary/30 transition-all p-4 gap-3 group min-h-[100px]"
      style={{ borderLeftColor: color }}
    >
      {/* ── Ligne haute ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span
              className="text-[10px] px-2 py-0.5 rounded-md font-semibold"
              style={{ background: `${color}15`, color }}
            >
              {t("categories." + setlist.category, { defaultValue: setlist.category })}
            </span>
            {setlist.isPrivate && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 font-medium border border-violet-200 dark:border-violet-800">
                {t("setlists.list.private")}
              </span>
            )}
          </div>

          {/* Titre */}
          <h2 className="text-sm font-semibold text-foreground group-hover:text-primary leading-snug">
            {setlist.title}
          </h2>
        </div>

        {/* Badge langue */}
        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
          {t("common.languages." + setlist.language, { defaultValue: setlist.language })}
        </span>
      </div>

      {/* ── Ligne basse ── */}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="capitalize font-medium text-foreground/70">
          {formatDate(setlist.date, i18n.language)}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span>{t("setlists.list.songCounter", { count: setlist.items.length })}</span>
          {setlist.leader && (
            <span className="text-muted-foreground/60">· {setlist.leader}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
