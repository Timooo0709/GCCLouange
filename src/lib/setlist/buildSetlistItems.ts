import type { FormItem, FormListItem } from "@/lib/setlist/formItems";
import { isFormFusion, isFormTransition } from "@/lib/setlist/formItems";
import type { SetlistItem, FusionSong } from "@/types/setList";

function formItemToFusionSong(item: FormItem, mixedNotes?: Record<string, string>): FusionSong {
  const allIds = (item.song.sections ?? []).map((s) => s.id);
  const currentIds = item.sectionItems.map((s) => s.sectionId);
  const structureOverride =
    JSON.stringify(currentIds) === JSON.stringify(allIds) ? null : currentIds;
  const sectionNotes = mixedNotes ?? Object.fromEntries(
    item.sectionItems.filter((s) => s.note.trim()).map((s) => [s.sectionId, s.note.trim()])
  );
  return {
    songSlug: item.song.slug,
    keyOverride: item.keyOverride,
    structureOverride,
    sectionNotes,
  };
}

export function buildSetlistItems(items: FormListItem[]): SetlistItem[] {
  return items.map((item, idx) => {
    if (isFormTransition(item)) {
      return {
        type: "transition" as const,
        songSlug: "",
        position: idx + 1,
        keyOverride: null,
        showChords: false,
        showPinyin: false,
        useJianpu: false,
        structureOverride: null,
        sectionNotes: {},
        notes: "",
        transitionText: item.text,
      };
    }
    if (isFormFusion(item)) {
      // Build per-song notes from mixed rows when active
      const mixedNotesBySong: Record<string, Record<string, string>> = {};
      if (item.mixedStructure) {
        for (const ms of item.mixedStructure) {
          if (ms.note.trim()) {
            if (!mixedNotesBySong[ms.songSlug]) mixedNotesBySong[ms.songSlug] = {};
            mixedNotesBySong[ms.songSlug][ms.sectionId] = ms.note.trim();
          }
        }
      }
      return {
        type: "fusion" as const,
        songSlug: "",
        position: idx + 1,
        keyOverride: null,
        showChords: true,
        showPinyin: false,
        useJianpu: false,
        structureOverride: null,
        sectionNotes: {},
        notes: "",
        fusionSongs: item.songs.map((song) =>
          formItemToFusionSong(song, item.mixedStructure ? (mixedNotesBySong[song.song.slug] ?? {}) : undefined)
        ),
        mixedStructure: item.mixedStructure?.map((ms) => ({
          songSlug: ms.songSlug,
          sectionId: ms.sectionId,
        })) ?? null,
      };
    }
    const allIds = (item.song.sections ?? []).map((s) => s.id);
    const currentIds = item.sectionItems.map((s) => s.sectionId);
    const currentUid = item.sectionItems.map((s) => s.uid);
    const structureOverride =
      JSON.stringify(currentIds) === JSON.stringify(allIds) ? null : currentUid;
    const sectionNotes = Object.fromEntries(
      item.sectionItems.filter((s) => s.note.trim()).map((s) => [s.uid, s.note.trim()])
    );
    return {
      songSlug: item.song.slug,
      position: idx + 1,
      keyOverride: item.keyOverride,
      showChords: true,
      showPinyin: item.song.language === "zh",
      useJianpu: false,
      structureOverride,
      sectionNotes,
      notes: item.notes,
    };
  });
}

export function detectSetlistLanguage(items: FormListItem[]): "fr" | "zh" | "mixed" {
  const langs = new Set(
    items.flatMap((i) => {
      if (isFormTransition(i)) return [];
      if (isFormFusion(i)) return i.songs.map((s) => s.song.language);
      return [i.song.language];
    })
  );
  if (langs.size === 0) return "fr";
  if (langs.size === 1) return [...langs][0] as "fr" | "zh";
  return "mixed";
}
