// hooks/useSetlistForm.ts
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isRestricted, updateSetlist } from "@/lib/firebase/setlists";
import { useTranslation } from "react-i18next";
import type { FormItem } from "@/lib/setlist/formItems";
import type { SetlistItem } from "@/types/setList";

interface UseSetlistFormParams {
  id: string;
  title: string;
  leader: string;
  category: string;
  notes: string;
  items: FormItem[];
  isDraft: boolean;
  user: unknown;
}

export function useSetlistForm({
  id, title, leader, category, notes, items, isDraft, user,
}: UseSetlistFormParams) {
  const { t } = useTranslation();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  async function doUpdate(publishDraft: boolean) {
    setError("");
    if (!title.trim()) { setError(t("setlists.form.titleRequired")); return; }
    if (!leader.trim()) { setError(t("setlists.form.leaderRequired")); return; }
    if (!category) { setError(t("setlists.form.categoryRequired")); return; }
    if (isRestricted(category) && !user) {
      router.push(`/login?from=/setlists/${id}/edit`);
      return;
    }

    publishDraft ? setPublishing(true) : setSaving(true);

    try {
      const setlistItems: SetlistItem[] = items.map((item, idx) => {
        const allIds = (item.song.sections ?? []).map((s) => s.id);
        const currentIds = item.sectionItems.map((s) => s.sectionId);
        console.log('currentIds', currentIds);
        const structureOverride =
          JSON.stringify(currentIds) === JSON.stringify(allIds) ? null : currentIds;
        const sectionNotes = Object.fromEntries(
          item.sectionItems
            .filter((s) => s.note.trim())
            .map((s) => [s.sectionId, s.note.trim()])
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

      const langs = new Set(items.map((i) => i.song.language));
      const language: "fr" | "zh" | "mixed" =
        langs.size === 0 ? "fr"
        : langs.size === 1 ? ([...langs][0] as "fr" | "zh")
        : "mixed";

      await updateSetlist(id, {
        title: title.trim(),
        leader: leader.trim(),
        category,
        language,
        notes: notes.trim(),
        items: setlistItems,
        isDraft: publishDraft ? false : isDraft,
      });

      router.push(`/setlists/${id}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t("setlists.form.errorSaveDefault"));
      publishDraft ? setPublishing(false) : setSaving(false);
    }
  }

  return { saving, publishing, error, doUpdate };
}