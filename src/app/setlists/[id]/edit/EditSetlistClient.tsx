"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSetlist } from "@/lib/firebase/setlists";
import { useTranslation } from "react-i18next";
import type { SongIndexEntry } from "@/types/song";
import { buildFormItems } from "@/lib/setlist/formItems";
import { SetlistForm, type SetlistFormInitial } from "@/components/setlists/SetlistForm";

export function EditSetlistClient() {
  const { t } = useTranslation();
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [songs, setSongs] = useState<SongIndexEntry[]>([]);
  const [initial, setInitial] = useState<SetlistFormInitial | null>(null);

  useEffect(() => {
    Promise.all([
      getSetlist(id),
      fetch("/songs-index.json").then((r) => r.json()),
    ]).then(([setlist, indexData]) => {
      if (!setlist) { router.push("/setlists"); return; }
      const songsMap: Record<string, SongIndexEntry> = {};
      for (const s of (indexData.songs ?? [])) songsMap[s.slug] = s;
      setSongs(indexData.songs ?? []);
      setInitial({
        title: setlist.title,
        date: setlist.date,
        leader: setlist.leader,
        category: setlist.category,
        notes: setlist.notes,
        isPrivate: setlist.isPrivate ?? false,
        ownerId: setlist.ownerId ?? null,
        items: buildFormItems(setlist.items, songsMap),
      });
    });
  }, [id, router]);

  if (!initial) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  return <SetlistForm mode="edit" setlistId={id} songs={songs} initial={initial} />;
}
