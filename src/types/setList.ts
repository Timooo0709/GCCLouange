import { Language } from "@/types/common";

export type FusionSong = {
  songSlug: string;
  keyOverride: string | null;
  structureOverride: string[] | null;
  sectionNotes: Record<string, string>;
};

export type FusionMixedSection = {
  songSlug: string;
  sectionId: string;
};

export type SetlistItem = {
  type?: "fusion" | "transition";
  songSlug: string;
  position: number;
  keyOverride: string | null;
  showChords: boolean;
  showPinyin: boolean;
  useJianpu: boolean;
  structureOverride: string[] | null;
  sectionNotes: Record<string, string>;
  notes: string;
  fusionSongs?: FusionSong[];
  mixedStructure?: FusionMixedSection[] | null;
  transitionText?: string;
};

export type Setlist = {
  id: string;
  title: string;
  date: string;
  theme: string | null;
  leader: string | null;
  language: Language;
  notes: string;
  items: SetlistItem[];
};
