"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, LogIn, LogOut } from "lucide-react";
import { getSetlists, ALL_CATEGORIES, type FSSetlist } from "@/lib/firebase/setlists";
import { useAuth, logOut } from "@/lib/firebase/auth";
import { useTranslation } from "react-i18next";

function formatDate(iso: string, language: string): string {
  const locale = language === "zh-CN" ? "zh-CN" : "fr-FR";
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso + "T12:00:00"));
}

function SetlistCard({ setlist }: { setlist: FSSetlist }) {
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

export default function SetlistsPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [setlists, setSetlists] = useState<FSSetlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("Toutes");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    getSetlists()
      .then(setSetlists)
      .finally(() => setLoading(false));
  }, []);

  // Load category filter from URL search params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("cat") || "Toutes";
    setCategoryFilter(cat);
    setIsInitialized(true);

    // Restore scroll position
    const savedScroll = sessionStorage.getItem("setlistsScrollPos");
    if (savedScroll) {
      setTimeout(() => {
        window.scrollTo({
          top: parseInt(savedScroll, 10),
          behavior: "instant" as ScrollBehavior
        });
      }, 80);
    }
  }, []);

  // Update URL search params and sessionStorage path when categoryFilter changes
  useEffect(() => {
    if (!isInitialized) return;

    const params = new URLSearchParams();
    if (categoryFilter !== "Toutes") params.set("cat", categoryFilter);

    const queryString = params.toString();
    const newUrl = window.location.pathname + (queryString ? `?${queryString}` : "");
    window.history.replaceState(null, "", newUrl);

    sessionStorage.setItem("lastListPath", newUrl);
  }, [categoryFilter, isInitialized]);

  // Save scroll position when navigating away
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem("setlistsScrollPos", window.scrollY.toString());
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filtered =
    categoryFilter === "Toutes"
      ? setlists
      : setlists.filter((s) => s.category === categoryFilter);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Nav header replacement with mobile create action line */}
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:gap-4 justify-between">
          <div className="flex items-center gap-3 sm:hidden ml-auto">
            {!authLoading && (user ? (
              <button onClick={() => logOut()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                <LogOut className="h-3.5 w-3.5" />
                {t("common.header.logout")}
              </button>
            ) : (
              <Link href="/login?from=/setlists" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <LogIn className="h-3.5 w-3.5" />
                {t("common.header.login")}
              </Link>
            ))}
            <Link href="/setlists/new" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              <Plus className="h-4 w-4" />
              {t("setlists.list.newButton")}
            </Link>
          </div>

          {/* Actions desktop */}
          <div className="hidden sm:flex ml-auto items-center gap-3">
            {!authLoading && (user ? (
              <button onClick={() => logOut()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                <LogOut className="h-3.5 w-3.5" />
                {t("common.header.logout")}
              </button>
            ) : (
              <Link href="/login?from=/setlists" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <LogIn className="h-3.5 w-3.5" />
                {t("common.header.login")}
              </Link>
            ))}
            <Link href="/setlists/new" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              <Plus className="h-4 w-4" />
              {t("setlists.list.newButton")}
            </Link>
          </div>
        </div>

        {/* Filtre par catégorie */}
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
              {cat === "Toutes" ? t("setlists.list.allCategories") : t("categories." + cat, { defaultValue: cat })}
            </button>
          ))}
        </div>

        {/* Liste */}
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
