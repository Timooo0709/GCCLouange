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

export interface FusionMixedSectionForm {
  uid: string;
  songSlug: string;
  sectionId: string;
  sectionName: string;
  songTitle: string;
  note: string;
}

export interface FormFusionItem {
  uid: string;
  kind: "fusion";
  songs: FormItem[];
  mixedStructure: FusionMixedSectionForm[] | null;
}

export interface FormTransitionItem {
  uid: string;
  kind: "transition";
  text: string;
}

export type FormListItem = FormItem | FormFusionItem | FormTransitionItem;

export function isFormFusion(item: FormListItem): item is FormFusionItem {
  return (item as FormFusionItem).kind === "fusion";
}

export function isFormTransition(item: FormListItem): item is FormTransitionItem {
  return (item as FormTransitionItem).kind === "transition";
}

export function makeDefaultSections(sections: SectionSummary[]): FormSectionItem[] {
  return sections.map((s, index) => ({
    uid: `${s.id}-${index}`,
    sectionId: s.id,
    name: s.name,
    note: "",
  }));
}

function toFormItem(
  song: SongIndexEntry,
  keyOverride: string | null,
  notes: string,
  structureOverride: string[] | null,
  sectionNotes: Record<string, string>
): FormItem {
  const allSections = song.sections ?? [];
  const orderedSections = structureOverride && structureOverride.length > 0
    ? structureOverride
        .map((id) => allSections.find((s) => s.id === id.replace(/-\d+$/,'')))
        .filter((s): s is SectionSummary => s !== undefined)
    : allSections;
  return {
    uid: nextUid(),
    song,
    keyOverride,
    notes,
    sectionItems: orderedSections.map((s,index) => ({
      uid: `${s.id}-${index}`,
      sectionId: s.id,
      name: s.name || s.type,
      note: sectionNotes?.[`${s.id}-${index}`] ?? "",
    })),
  };
}

export function buildFormItems(
  items: SetlistItem[],
  songsMap: Record<string, SongIndexEntry>
): FormListItem[] {
  return [...items]
    .sort((a, b) => a.position - b.position)
    .flatMap((item): FormListItem[] => {
      if (item.type === "transition") {
        return [{ uid: nextUid(), kind: "transition", text: item.transitionText ?? "" }];
      }
      if (item.type === "fusion" && item.fusionSongs) {
        const songs: FormItem[] = item.fusionSongs.flatMap((fs) => {
          const song = songsMap[fs.songSlug];
          if (!song) return [];
          return [toFormItem(song, fs.keyOverride, "", fs.structureOverride, fs.sectionNotes)];
        });
        if (songs.length === 0) return [];

        let mixedStructure: FusionMixedSectionForm[] | null = null;
        if (item.mixedStructure && item.mixedStructure.length > 0) {
          mixedStructure = item.mixedStructure.flatMap((ms): FusionMixedSectionForm[] => {
            const song = songsMap[ms.songSlug];
            if (!song) return [];
            const section = (song.sections ?? []).find((s) => s.id === ms.sectionId);
            if (!section) return [];
            const fusionSong = item.fusionSongs!.find((fs) => fs.songSlug === ms.songSlug);
            return [{
              uid: nextUid(),
              songSlug: ms.songSlug,
              sectionId: ms.sectionId,
              sectionName: section.name || section.type,
              songTitle: song.title,
              note: fusionSong?.sectionNotes?.[ms.sectionId] ?? "",
            }];
          });
        }

        return [{ uid: nextUid(), kind: "fusion", songs, mixedStructure }];
      }

      const song = songsMap[item.songSlug];
      console.log("items",items)
      if (!song) return [];
      return [toFormItem(song, item.keyOverride, item.notes, item.structureOverride, item.sectionNotes)];
    });
}
