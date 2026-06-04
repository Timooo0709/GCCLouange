import * as fs from "fs";
import * as path from "path";
import { getSongSlugs, loadSong } from "@/lib/content/loadSongs";
import { SongListClient } from "./SongListClient";
import type { SongIndexEntry, Theme } from "@/types/song";

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
      <main className="max-w-2xl mx-auto px-4 py-6 mt-[106px]">
        <SongListClient songs={songs} themes={themes} />
      </main>
    </div>
  );
}
