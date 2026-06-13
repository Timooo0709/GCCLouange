"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getSetlist, type FSSetlist } from "@/lib/firebase/setlists";
import { useProfile } from "@/lib/firebase/users";
import { canEditSetlist } from "@/lib/access";
import { useTranslation } from "react-i18next";
import type { SongIndexEntry } from "@/types/song";
import { buildFormItems } from "@/lib/setlist/formItems";
import { SetlistForm, type SetlistFormInitial } from "@/components/setlists/SetlistForm";

export function EditSetlistClient() {
  const { t } = useTranslation();
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user, profile, loading: authLoading } = useProfile();

  const [songs, setSongs] = useState<SongIndexEntry[]>([]);
  const [setlist, setSetlist] = useState<FSSetlist | null>(null);
  const [initial, setInitial] = useState<SetlistFormInitial | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    Promise.all([
      getSetlist(id),
      fetch("/songs-index.json").then((r) => r.json()),
    ]).then(([sl, indexData]) => {
      if (!sl) { router.push("/setlists"); return; }
      const songsMap: Record<string, SongIndexEntry> = {};
      for (const s of (indexData.songs ?? [])) songsMap[s.slug] = s;
      setSongs(indexData.songs ?? []);
      setSetlist(sl);
      setInitial({
        title: sl.title,
        date: sl.date,
        leader: sl.leader,
        category: sl.category,
        notes: sl.notes,
        isPrivate: sl.isPrivate ?? false,
        ownerId: sl.ownerId ?? null,
        items: buildFormItems(sl.items, songsMap),
      });
    });
  }, [id, router, authLoading, user]);

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-muted-foreground">{t("setlists.detail.loginRequired")}</p>
        <Link href={`/login?from=/setlists/${id}/edit`} className="text-sm text-primary hover:underline">
          {t("common.header.login")}
        </Link>
      </div>
    );
  }

  if (!initial || !setlist || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  // Modification : créateur de la setlist + musiciens du même service
  if (!canEditSetlist(user, profile, setlist)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-muted-foreground">{t("setlists.detail.noEditAccess")}</p>
        <Link href={`/setlists/${id}`} className="text-sm text-primary hover:underline">
          {t("setlists.detail.back")}
        </Link>
      </div>
    );
  }

  return <SetlistForm mode="edit" setlistId={id} songs={songs} initial={initial} />;
}
