import type { parseChordPro } from "@/lib/chordpro/parser";
import type { SectionItem } from "@/types/song";

/**
 * Résout un structureOverride (liste d'UIDs `<sectionId>-<n>`, ou d'IDs de
 * section pour les anciennes setlists) vers les sections correspondantes,
 * avec un uid propre par occurrence.
 */
export function resolveStructureOverride<T extends { id: string; uid: string }>(
  sections: T[],
  structureOverride: string[],
): T[] {
  return structureOverride.flatMap((ov, index) => {
    const baseId = ov.replace(/-\d+$/, "");
    const section = sections.find((s) => s.uid === ov || s.id === ov || s.id === baseId);
    if (!section) return [];
    const uid = /-\d+$/.test(ov) ? ov : `${baseId}-${index}`;
    return [{ ...section, uid }];
  });
}

export function buildDefaultStructure(sections: ReturnType<typeof parseChordPro>["sections"]): SectionItem[] {
  return sections.map((s, i) => ({
    uid: `${s.id}-${i}`,
    sectionId: s.id,
    name: s.name || s.type,
    note: "",
  }));
}