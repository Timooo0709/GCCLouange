import { Language } from "@/types/common";

export type Song = {
  slug: string;
  title: string;
  titlePinyin: string | null;
  artist: string;
  language: Language;
  originalKey: string;
  tempo: number | null;
  themes: string[];
  youtubeUrl: string | null;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
  hasJianpu: boolean;
  jianpuKey: string | null;
  chordProSource: string;
};

export type SectionSummary = {
  id: string;
  name: string;
  type: string;
  number?: string;
  suffix?: string;
};

export type SongIndexEntry = Omit<Song, "chordProSource"> & {
  sections?: SectionSummary[];
};

export type SongsIndex = {
  generatedAt: string;
  songs: SongIndexEntry[];
};


export type Theme = {
  slug: string;
  name_fr: string;
  name_zh: string;
};

export interface SectionItem {
  uid: string;        // unique instance id (section.id + "-" + index)
  sectionId: string;  // original section id
  name: string;
  note: string;
}