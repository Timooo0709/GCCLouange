import { Language } from "@/types/common";

export type SetlistItem = {
  songSlug: string;
  position: number;
  keyOverride: string | null;
  showChords: boolean;
  showPinyin: boolean;
  useJianpu: boolean;
  structureOverride: string[] | null;
  sectionNotes: Record<string, string>;
  notes: string;
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
