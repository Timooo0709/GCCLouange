import type { FormItem } from "@/lib/setlist/formItems";
import type { SetlistItem } from "@/types/setList";

export function buildSetlistItems(items: FormItem[]): SetlistItem[] {
  return items.map((item, idx) => {
    const allIds = (item.song.sections ?? []).map((s) => s.id);
    const currentIds = item.sectionItems.map((s) => s.sectionId);
    const structureOverride =
      JSON.stringify(currentIds) === JSON.stringify(allIds) ? null : currentIds;
    const sectionNotes = Object.fromEntries(
      item.sectionItems.filter((s) => s.note.trim()).map((s) => [s.sectionId, s.note.trim()])
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

export function detectSetlistLanguage(items: FormItem[]): "fr" | "zh" | "mixed" {
  const langs = new Set(items.map((i) => i.song.language));
  if (langs.size === 0) return "fr";
  if (langs.size === 1) return [...langs][0] as "fr" | "zh";
  return "mixed";
}