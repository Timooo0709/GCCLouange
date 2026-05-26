"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { Search, X } from "lucide-react";
import type { SongIndexEntry, Theme } from "@/lib/types";

interface SongListClientProps {
  songs: SongIndexEntry[];
  themes: Theme[];
}

export function SongListClient({ songs, themes }: SongListClientProps) {
  const [query, setQuery] = useState("");
  const [langFilter, setLangFilter] = useState<"all" | "fr" | "zh">("all");
  const [themeFilter, setThemeFilter] = useState("");

  const fuse = useMemo(
    () =>
      new Fuse(songs, {
        keys: ["title", "titlePinyin", "artist"],
        threshold: 0.4,
        includeScore: true,
      }),
    [songs]
  );

  const compareSongTitles = (a: SongIndexEntry, b: SongIndexEntry) => {
    const titleA = a.title.normalize("NFC").toLowerCase();
    const titleB = b.title.normalize("NFC").toLowerCase();

    if (titleA < titleB) return -1;
    if (titleA > titleB) return 1;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
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
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          placeholder="Rechercher un chant ou un artiste…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-8 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Effacer la recherche"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {/* Langue */}
        <div className="flex gap-1">
          {(["all", "fr", "zh"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLangFilter(lang)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                langFilter === lang
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {lang === "all" ? "Tous" : lang === "fr" ? "FR" : "中文"}
            </button>
          ))}
        </div>

        {/* Thème */}
        <select
          value={themeFilter}
          onChange={(e) => setThemeFilter(e.target.value)}
          className="px-2.5 py-1 rounded text-xs bg-muted text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
        >
          <option value="">Tous les thèmes</option>
          {availableThemes.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name_fr}
            </option>
          ))}
        </select>

        {hasFilter && (
          <button
            onClick={reset}
            className="px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Compteur */}
      <p className="text-xs text-muted-foreground mb-3">
        {filtered.length === songs.length
          ? `${songs.length} chant${songs.length > 1 ? "s" : ""}`
          : `${filtered.length} résultat${filtered.length !== 1 ? "s" : ""} sur ${songs.length}`}
      </p>

      {/* Liste */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          Aucun chant trouvé.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((song) => (
            <li key={song.slug}>
              <Link
                href={`/songs/${song.slug}`}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {song.title}
                  </div>
                  {song.titlePinyin && (
                    <div className="text-xs text-muted-foreground">
                      {song.titlePinyin}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">{song.artist}</div>
                  {song.themes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {song.themes.slice(0, 3).map((slug) => {
                        const theme = availableThemes.find((t) => t.slug === slug);
                        return (
                          <span
                            key={slug}
                            className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                          >
                            {theme?.name_fr ?? slug}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    {song.originalKey}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      song.language === "zh"
                        ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                        : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                    }`}
                  >
                    {song.language === "zh" ? "中文" : "FR"}
                  </span>
                  {song.hasJianpu && (
                    <span className="text-xs text-[#B91C1C] dark:text-red-400">
                      简谱
                    </span>
                  )}
                  {song.youtubeUrl && (
                    <span className="text-xs text-muted-foreground" title="YouTube disponible">
                      ▶
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
