import * as fs from "fs";
import * as path from "path";
import { parseChordPro } from "../src/lib/chordpro/parser";

const SONGS_DIR = path.join(process.cwd(), "content", "songs");
const VALID_KEY = /^[A-G][#b]?m?$/;

function main() {
  const files = fs
    .readdirSync(SONGS_DIR)
    .filter((f) => f.endsWith(".cho") && !f.startsWith("_"))
    .sort();

  const errors: string[] = [];

  for (const file of files) {
    const source = fs.readFileSync(path.join(SONGS_DIR, file), "utf-8");
    try {
      const ast = parseChordPro(source);
      const m = ast.metadata;
      if (!m.title?.trim()) errors.push(`${file} : titre manquant ({title: …})`);
      if (!m.key) errors.push(`${file} : tonalité manquante ({key: …})`);
      else if (!VALID_KEY.test(m.key)) errors.push(`${file} : tonalité invalide « ${m.key} »`);
      if (!["fr", "zh"].includes(m.language)) errors.push(`${file} : langue invalide « ${m.language} » (fr|zh)`);
      if (ast.sections.length === 0) errors.push(`${file} : aucune section`);
    } catch (e) {
      errors.push(`${file} : échec du parsing — ${(e as Error).message}`);
    }
  }

  if (errors.length) {
    console.error(`✗ ${errors.length} problème(s) détecté(s) sur ${files.length} chant(s) :`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`✓ ${files.length} chant(s) valides`);
}

main();
