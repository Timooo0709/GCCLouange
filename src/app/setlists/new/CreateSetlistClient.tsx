"use client";

import { useState, useEffect } from "react";
import type { SongIndexEntry } from "@/types/song";
import { SetlistForm } from "@/components/setlists/SetlistForm";

export function CreateSetlistClient() {
  const [songs, setSongs] = useState<SongIndexEntry[]>([]);

  useEffect(() => {
    fetch("/songs-index.json")
      .then((r) => r.json())
      .then((data) => setSongs(data.songs ?? []));
  }, []);

  return <SetlistForm mode="create" songs={songs} />;
}
