import { parseChordPro } from "@/lib/chordpro/parser";
import type { ChordProAST } from "@/types/chordPro";

export interface SongContent {
  slug: string;
  ast: ChordProAST;
}

export async function fetchSongContent(slug: string): Promise<SongContent | null> {
  try {
    const res = await fetch(`/api/songs/${slug}`);
    if (!res.ok) return null;
    const song = await res.json();
    return { slug, ast: parseChordPro(song.chordProSource) };
  } catch {
    return null;
  }
}

export async function fetchMissingSongContents(
  slugs: string[],
  existing: Record<string, SongContent>
): Promise<Record<string, SongContent>> {
  const missing = slugs.filter((slug) => !existing[slug]);
  const results = await Promise.all(missing.map(fetchSongContent));
  const fetched: Record<string, SongContent> = {};
  for (const content of results) {
    if (content) fetched[content.slug] = content;
  }
  return { ...existing, ...fetched };
}