// lib/api/songs.ts
import { parseChordPro } from "@/lib/chordpro/parser";
import type { ChordProAST } from "@/types/chordPro";

export interface SongContent {
  slug: string;
  ast: ChordProAST;
}

export async function fetchSongAST(slug: string): Promise<SongContent | null> {
  try {
    const res = await fetch(`/api/song/${slug}`);
    if (!res.ok) return null;
    const song = await res.json();
    return { slug, ast: parseChordPro(song.chordProSource) };
  } catch {
    return null;
  }
}