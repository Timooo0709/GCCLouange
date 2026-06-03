import fs from "fs";
import path from "path";
import type { Setlist } from "@/types/setList";

const SETLISTS_DIR = path.join(process.cwd(), "content", "setlists");

export function loadSetlists(): Setlist[] {
  if (!fs.existsSync(SETLISTS_DIR)) return [];
  const files = fs.readdirSync(SETLISTS_DIR).filter((f) => f.endsWith(".json"));
  const setlists = files
    .map((f) => {
      try {
        return JSON.parse(
          fs.readFileSync(path.join(SETLISTS_DIR, f), "utf-8")
        ) as Setlist;
      } catch {
        return null;
      }
    })
    .filter((s): s is Setlist => s !== null);
  return setlists.sort((a, b) => b.date.localeCompare(a.date));
}

export function loadSetlist(id: string): Setlist | null {
  const file = path.join(SETLISTS_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as Setlist;
  } catch {
    return null;
  }
}
