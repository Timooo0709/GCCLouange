import * as fs from "fs";
import * as path from "path";
import { parseChordPro } from "@/lib/chordpro/parser";
import type { Song } from "@/lib/types";

const SONGS_DIR = path.join(process.cwd(), "content", "songs");

function slugifyTheme(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[éèê]/g, "e")
    .replace(/[àâ]/g, "a")
    .replace(/[ùû]/g, "u")
    .replace(/[ôó]/g, "o")
    .replace(/[îï]/g, "i");
}

export function getSongSlugs(): string[] {
  return fs
    .readdirSync(SONGS_DIR)
    .filter((f) => f.endsWith(".cho") && !f.startsWith("_"))
    .map((f) => f.replace(/\.cho$/, ""));
}

export function loadSong(slug: string): Song {
  const filePath = path.join(SONGS_DIR, `${slug}.cho`);
  const source = fs.readFileSync(filePath, "utf-8");
  const ast = parseChordPro(source);
  const m = ast.metadata;

  const hasJianpu = ast.sections.some((s) =>
    s.lines.some((l) => l.jianpu !== null)
  );

  return {
    slug,
    title: m.title,
    titlePinyin: m.titlePinyin,
    artist: m.artist,
    language: m.language,
    originalKey: m.key,
    tempo: m.tempo,
    themes: m.themes.map(slugifyTheme),
    youtubeUrl: m.youtubeUrl,
    spotifyUrl: m.spotifyUrl,
    appleMusicUrl: m.appleMusicUrl,
    hasJianpu,
    jianpuKey: m.jianpuKey,
    chordProSource: source,
  };
}
