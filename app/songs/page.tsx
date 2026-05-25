import * as fs from "fs";
import * as path from "path";
import { getSongSlugs, loadSong } from "@/lib/content/loadSongs";
import { SongListClient } from "./SongListClient";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import type { SongIndexEntry, Theme } from "@/lib/types";

export const dynamic = "force-static";

export default async  function SongsPage() {
  const slugs = getSongSlugs();
  const songs: SongIndexEntry[] = slugs.map((slug) => {
    const { chordProSource: _, ...entry } = loadSong(slug);
    return entry;
  });


  const themesPath = path.join(process.cwd(), "content", "themes.json");
  const themes: Theme[] = JSON.parse(fs.readFileSync(themesPath, "utf-8")).themes;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4 flex items-center gap-4">
        <span className="text-xl font-bold text-foreground">GCC Louange</span>
        <nav className="flex gap-1">
          <a
            href="/songs"
            className="px-3 py-1.5 rounded text-sm font-medium bg-muted text-foreground"
          >
            Chants
          </a>
          <a
            href="/setlists"
            className="px-3 py-1.5 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Setlists
          </a>
        </nav>
        <div className="ml-auto">
          <DarkModeToggle />
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <SongListClient songs={songs} themes={themes} />
      </main>
    </div>
  );
}
