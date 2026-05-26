import * as fs from "fs";
import * as path from "path";
import { getSongSlugs, loadSong } from "../lib/content/loadSongs";
import { parseChordPro } from "../lib/chordpro/parser";

const OUTPUT_FILE = path.join(process.cwd(), "public", "songs-index.json");

function main() {
  const slugs = getSongSlugs();
  const songs = slugs.map((slug) => {
    const song = loadSong(slug);
    const ast = parseChordPro(song.chordProSource);
    const { chordProSource: _, ...entry } = song;
    return {
      ...entry,
      sections: ast.sections.map((s) => ({
        id: s.id,
        name: s.name || s.type,
        type: s.type,
        number: s.number,
        suffix: s.suffix,
      })),
    };
  });

  songs.sort((a, b) => a.title.localeCompare(b.title, "fr", { sensitivity: "base" }));

  const output = { generatedAt: new Date().toISOString(), songs };
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
  console.log(`✓ ${songs.length} chant(s) indexé(s) → ${OUTPUT_FILE}`);
}

main();
