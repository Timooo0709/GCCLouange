"use client";

import { useEffect, useState } from "react";
import { ALL_CATEGORIES, getSetlists, type FSSetlist } from "@/lib/firebase/setlists";
import { useTranslation } from "react-i18next";
import { HeaderActions } from "@/components/setlists/HeaderActions";
import { SetlistCard } from "@/components/setlists/SetlistCard";
import { useSetlistsNavState } from "@/hooks/useSetlistsNavState";

export default function SetlistsPage() {
  const { t } = useTranslation();
  const [setlists, setSetlists] = useState<FSSetlist[]>([]);
  const [loading, setLoading] = useState(true);
  const { categoryFilter, setCategoryFilter } = useSetlistsNavState();

  useEffect(() => {
    getSetlists()
      .then(setSetlists)
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    categoryFilter === "Toutes"
      ? setlists
      : setlists.filter((s) => s.category === categoryFilter);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex mb-6 justify-end">
          <HeaderActions />
        </div>

        <div className="flex gap-1.5 flex-wrap mb-5">
          {["Toutes", ...ALL_CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {cat === "Toutes"
                ? t("setlists.list.allCategories")
                : t("categories." + cat, { defaultValue: cat })}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-16">
            {t("common.loading")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-16">
            {setlists.length === 0
              ? t("setlists.list.empty")
              : t("setlists.list.emptyCategory")}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((s) => (
              <SetlistCard key={s.id} setlist={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}