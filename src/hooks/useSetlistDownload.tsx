"use client";

import { useState } from "react";
import { fetchMissingSongContents, type SongContent } from "@/lib/utils/fetchSongContent";
import type { FSSetlist } from "@/lib/firebase/setlists";
import type { SongIndexEntry } from "@/types/song";

interface UseSetlistDownloadParams {
  setlist: FSSetlist | null;
  songsMap: Record<string, SongIndexEntry>;
  contents: Record<string, SongContent>;
  setContents: (c: Record<string, SongContent>) => void;
  view: "liste" | "partitions";
  language: string;
}

export function useSetlistDownload({
  setlist,
  songsMap,
  contents,
  setContents,
  view,
  language,
}: UseSetlistDownloadParams) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!setlist) return;
    setDownloading(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");

      if (view === "liste") {
        const { SetlistOverviewPDF } = await import("@/components/pdf/SetlistOverviewPDF");
        const blob = await pdf(
          <SetlistOverviewPDF setlist={setlist} songsMap={songsMap} language={language} />
        ).toBlob();
        triggerDownload(blob, `${setlist.title}-liste.pdf`);
      } else {
        const slugs = setlist.items.flatMap((i) => {
          if (i.type === "transition") return [];
          if (i.type === "fusion" && i.fusionSongs) return i.fusionSongs.map((fs) => fs.songSlug);
          return [i.songSlug];
        });
        const allContents = await fetchMissingSongContents(slugs, contents);
        setContents(allContents);

        const { SetlistFullPDF } = await import("@/components/pdf/SetlistFullPDF");
        const blob = await pdf(
          <SetlistFullPDF setlist={setlist} contents={allContents} />
        ).toBlob();
        triggerDownload(blob, `${setlist.title}-partitions.pdf`);
      }
    } finally {
      setDownloading(false);
    }
  }

  return { handleDownload, downloading };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}