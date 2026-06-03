"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SongIndexEntry, Theme } from "@/lib/types";

interface SongListClientProps {
  songs: SongIndexEntry[];
  themes: Theme[];
}

export function SongListClient({ songs, themes }: SongListClientProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const isZhLocale = currentLang === "zh-CN";

  const [query, setQuery] = useState("");
  const [langFilter, setLangFilter] = useState<"all" | "fr" | "zh">("all");
  const [themeFilter, setThemeFilter] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from URL search params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    const lang = (params.get("lang") || "all") as "all" | "fr" | "zh";
    const theme = params.get("theme") || "";
    
    setQuery(q);
    setLangFilter(lang);
    setThemeFilter(theme);
    setIsInitialized(true);

    // Restore scroll position
    const savedScroll = sessionStorage.getItem("songsScrollPos");
    if (savedScroll) {
      setTimeout(() => {
        window.scrollTo({
          top: parseInt(savedScroll, 10),
          behavior: "instant" as ScrollBehavior
        });
      }, 80);
    }
  }, []);

  // Update URL search params and sessionStorage path when state changes
  useEffect(() => {
    if (!isInitialized) return;
    
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (langFilter !== "all") params.set("lang", langFilter);
    if (themeFilter) params.set("theme", themeFilter);
    
    const queryString = params.toString();
    const newUrl = window.location.pathname + (queryString ? `?${queryString}` : "");
    window.history.replaceState(null, "", newUrl);
    
    sessionStorage.setItem("lastListPath", newUrl);
  }, [query, langFilter, themeFilter, isInitialized]);

  // Save scroll position when navigating away
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem("songsScrollPos", window.scrollY.toString());
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(songs, {
        keys: ["title", "titlePinyin", "artist"],
        threshold: 0.4,
        includeScore: true,
      }),
    [songs]
  );

  const getSortKey = (song: SongIndexEntry) => {
    const key = song.language === "zh" && song.titlePinyin ? song.titlePinyin : song.title;
    return key
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  };

  const compareSongTitles = (a: SongIndexEntry, b: SongIndexEntry) => {
    const keyA = getSortKey(a);
    const keyB = getSortKey(b);

    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;
    return a.slug.localeCompare(b.slug);
  };

  const filtered = useMemo(() => {
    let result = query.trim()
      ? fuse.search(query.trim()).map((r) => r.item)
      : [...songs].sort(compareSongTitles);

    if (langFilter !== "all") {
      result = result.filter((s) => s.language === langFilter);
    }
    if (themeFilter) {
      result = result.filter((s) => s.themes.includes(themeFilter));
    }

    return result;
  }, [query, langFilter, themeFilter, fuse, songs]);

  const usedThemeSlugs = new Set(songs.flatMap((s) => s.themes));
  const availableThemes = themes.filter((t) => usedThemeSlugs.has(t.slug));
  const hasFilter = query.trim() !== "" || langFilter !== "all" || themeFilter !== "";

  function reset() {
    setQuery("");
    setLangFilter("all");
    setThemeFilter("");
  }

  return (
    <div>
      {/* Barre de recherche */}
      <div className="relative mb-3.5">
        <Search className="absolute left-[14px] top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/70 pointer-events-none" />
        <input
          type="search"
          placeholder={t("songs.list.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-[46px] pl-[42px] pr-10 border border-border rounded-xl bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 text-[15px] transition-all duration-150"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label={t("songs.list.clearSearch")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {/* Langue — segmented control */}
        <div className="inline-flex bg-secondary rounded-[9px] p-[3px] gap-0.5">
          {(["all", "fr", "zh"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLangFilter(lang)}
              className={`px-3 py-1.5 rounded-[7px] text-[12.5px] font-semibold transition-all duration-150 cursor-pointer ${
                langFilter === lang
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {lang === "all" ? t("songs.list.allLanguages") : lang === "fr" ? "FR" : "中文"}
            </button>
          ))}
        </div>

        {/* Thème */}
        <select
          value={themeFilter}
          onChange={(e) => setThemeFilter(e.target.value)}
          className="h-8 pl-3 pr-7 rounded-[8px] text-[12.5px] font-semibold bg-card text-foreground/80 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7079' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 9px center" }}
        >
          <option value="">{t("songs.list.filterTheme")}</option>
          {availableThemes.map((themeItem) => (
            <option key={themeItem.slug} value={themeItem.slug}>
              {isZhLocale ? themeItem.name_zh : themeItem.name_fr}
            </option>
          ))}
        </select>

        {hasFilter && (
          <button
            onClick={reset}
            className="text-[12.5px] font-semibold text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 cursor-pointer"
          >
            {t("common.buttons.reset")}
          </button>
        )}
      </div>

      {/* Compteur */}
      <p className="text-[12.5px] text-muted-foreground mb-3">
        {filtered.length === songs.length
          ? t("songs.list.counter", { count: songs.length })
          : t("songs.list.counterFiltered", { count: filtered.length, filteredCount: filtered.length, totalCount: songs.length })}
      </p>

      {/* Liste */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {t("songs.list.noSongsFound")}
        </p>
      ) : (
        <ul className="flex flex-col gap-[9px]">
          {filtered.map((song) => (
            <li key={song.slug}>
              <Link
                href={`/songs/${song.slug}`}
                className="flex overflow-hidden border border-border rounded-xl bg-card hover:border-muted-foreground/40 hover:shadow-[0_4px_14px_rgba(20,22,28,0.08),0_2px_6px_rgba(20,22,28,0.05)] transition-all duration-150 active:scale-[.995]"
              >
                {/* Language rail */}
                <span
                  className="w-[5px] shrink-0"
                  style={{ background: song.language === "zh" ? "var(--jianpu-color)" : "#3f63cf" }}
                />
                {/* Body */}
                <span className="flex-1 min-w-0 px-[15px] py-[13px] flex items-center gap-3">
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-[15.5px] leading-tight tracking-[-0.2px] text-foreground">
                      {song.title}
                    </span>
                    {song.titlePinyin && (
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {song.titlePinyin}
                      </span>
                    )}
                    <span className="block text-[13px] text-muted-foreground mt-0.5">
                      {song.artist}
                    </span>
                    {song.themes.length > 0 && (
                      <span className="flex flex-wrap gap-[5px] mt-2">
                        {song.themes.slice(0, 3).map((slug) => {
                          const theme = availableThemes.find((themeObj) => themeObj.slug === slug);
                          return (
                            <span
                              key={slug}
                              className="text-[11px] font-semibold text-foreground/70 bg-secondary px-2 py-0.5 rounded-full"
                            >
                              {(isZhLocale ? theme?.name_zh : theme?.name_fr) ?? slug}
                            </span>
                          );
                        })}
                      </span>
                    )}
                  </span>
                  {/* Meta */}
                  <span className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="font-mono text-xs font-semibold bg-secondary text-foreground px-2 py-0.5 rounded-[7px] border border-border/60">
                      {song.originalKey}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[40px] text-center ${
                        song.language === "zh"
                          ? "bg-red-100 dark:bg-[#321617] text-red-700 dark:text-[#ff8e85]"
                          : "bg-blue-100 dark:bg-[#18233f] text-blue-700 dark:text-[#8fb0ff]"
                      }`}
                    >
                      {song.language === "zh" ? "中文" : "FR"}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
