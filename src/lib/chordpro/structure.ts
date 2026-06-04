import type { parseChordPro } from "@/lib/chordpro/parser";
import type { SectionItem } from "@/types/song";

export function buildDefaultStructure(sections: ReturnType<typeof parseChordPro>["sections"]): SectionItem[] {
  return sections.map((s, i) => ({
    uid: `${s.id}-${i}`,
    sectionId: s.id,
    name: s.name || s.type,
    note: "",
  }));
}