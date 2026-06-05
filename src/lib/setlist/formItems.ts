// lib/setlist/formItems.ts
import { nextUid } from "@/lib/uid";
import type { SetlistItem } from "@/types/setList";
import type { SongIndexEntry, SectionSummary } from "@/types/song";

export interface FormSectionItem {
  uid: string;
  sectionId: string;
  name: string;
  note: string;
}

export interface FormItem {
  uid: string;
  song: SongIndexEntry;
  keyOverride: string | null;
  notes: string;
  sectionItems: FormSectionItem[];
}

export function makeDefaultSections(sections: SectionSummary[]): FormSectionItem[] {
  return sections.map((s, index) => ({
    uid: `${s.id}-${index}`,
    sectionId: s.id,
    name: s.name,
    note: "",
  }));
}

export function buildFormItems(
  items: SetlistItem[],
  songsMap: Record<string, SongIndexEntry>
): FormItem[] {
  return [...items]
    .sort((a, b) => a.position - b.position)
    .flatMap((item) => {
      const song = songsMap[item.songSlug];
      if (!song) return [];
      const allSections = song.sections ?? [];
      const orderedSections = item.structureOverride
        ? item.structureOverride
            .map((uid) => {
              const section = allSections.find((s) => s.id === uid.replace(/-\d+$/, ""));
              return section ? { ...section, uid } : undefined;
              })
            .filter((s): s is SectionSummary => s !== undefined)
        : allSections;
      const sectionItems: FormSectionItem[] = orderedSections.map((s, index) => ({
        uid: `${s.id}-${index}`,
        sectionId: s.id,
        name: s.name || s.type,
        note: item.sectionNotes?.[s.uid] ?? "",
      }));
      
      return [{
        uid: nextUid(),
        song,
        keyOverride: item.keyOverride,
        notes: item.notes,
        sectionItems,
      }];
    });
}