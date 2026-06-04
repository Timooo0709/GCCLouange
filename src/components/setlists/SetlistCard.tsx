"use client";

import Link from "next/link";
import { type FSSetlist } from "@/lib/firebase/setlists";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/utils/formatDate";

export function SetlistCard({ setlist }: { setlist: FSSetlist }) {
  const { t, i18n } = useTranslation();

  return (
    <Link
      href={`/setlists/${setlist.id}`}
      className="block rounded-xl border border-border bg-background hover:bg-muted/40 transition-colors p-4 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground group-hover:text-primary truncate">
              {setlist.title}
            </h2>
            {setlist.isDraft && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-800">
                {t("setlists.list.draft")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground capitalize mt-0.5">
            {formatDate(setlist.date, i18n.language)}
          </p>
        </div>
        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
          {t("common.languages." + setlist.language, { defaultValue: setlist.language })}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="px-2 py-0.5 rounded bg-muted text-foreground text-[10px]">
          {t("categories." + setlist.category, { defaultValue: setlist.category })}
        </span>
        <span>{t("setlists.list.songCounter", { count: setlist.items.length })}</span>
        {setlist.leader && <span>— {setlist.leader}</span>}
      </div>
    </Link>
  );
}