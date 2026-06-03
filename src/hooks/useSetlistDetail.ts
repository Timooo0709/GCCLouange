"use client";

import { useEffect, useState, useCallback } from "react";
import { getSetlist, type FSSetlist } from "@/lib/firebase/setlists";
import { fetchMissingSongContents, type SongContent } from "@/lib/utils/fetchSongContent";
import type { SetlistItem } from "@/types/setList";
import type { SongIndexEntry } from "@/types/song";

export function useSetlistDetail(id: string) {
  const [setlist, setSetlist] = useState<FSSetlist | null>(null);
  const [songsMap, setSongsMap] = useState<Record<string, SongIndexEntry>>({});
  const [contents, setContents] = useState<Record<string, SongContent>>({});
  const [loadingSetlist, setLoadingSetlist] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [backPath, setBackPath] = useState("/setlists");

  // Restauration du chemin de retour
  useEffect(() => {
    const saved = sessionStorage.getItem("lastListPath");
    if (saved && (saved.startsWith("/setlists?") || saved === "/setlists")) {
      setBackPath(saved);
    }
    sessionStorage.setItem("lastListPath", window.location.pathname);
  }, []);

  // Chargement setlist + index des chansons
  useEffect(() => {
    if (!id) return;
    Promise.all([
      getSetlist(id),
      fetch("/songs-index.json").then((r) => r.json()),
    ]).then(([sl, index]) => {
      setSetlist(sl);
      const map: Record<string, SongIndexEntry> = {};
      for (const s of index.songs ?? []) map[s.slug] = s;
      setSongsMap(map);
    }).finally(() => setLoadingSetlist(false));
  }, [id]);

  // Chargement du contenu complet pour la vue Partitions
  const loadContents = useCallback(async (items: SetlistItem[]) => {
    setLoadingContent(true);
    const slugs = items.map((i) => i.songSlug);
    const updated = await fetchMissingSongContents(slugs, contents);
    setContents(updated);
    setLoadingContent(false);
  }, [contents]);

  return {
    setlist,
    songsMap,
    contents,
    setContents,
    loadingSetlist,
    loadingContent,
    backPath,
    loadContents,
  };
}