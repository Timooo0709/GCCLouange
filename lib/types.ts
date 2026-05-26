export type Language = "fr" | "zh";

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

export type Theme = {
  slug: string;
  name_fr: string;
  name_zh: string;
};

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
  language: "fr" | "zh" | "mixed";
  notes: string;
  items: SetlistItem[];
};

export type SongsIndex = {
  generatedAt: string;
  songs: SongIndexEntry[];
};

// --- Types pour le parser ChordPro ---

export type ChordToken = {
  type: "chord";
  value: string;
};

export type LyricToken = {
  type: "lyric";
  value: string;
};

export type Token = ChordToken | LyricToken;

export type ChordProLine = {
  type: "line";
  tokens: Token[];
  pinyin: string | null;
  jianpu: string | null;
};

export type ChordProSection = {
  type: "verse" | "chorus" | "bridge" | "intro" | "outro" | "prechorus" | "other";
  id: string;
  name: string;
  number?: string;
  suffix?: string;
  lines: ChordProLine[];
};

export type ChordProAST = {
  metadata: {
    title: string;
    titlePinyin: string | null;
    artist: string;
    key: string;
    jianpuKey: string | null;
    tempo: number | null;
    language: Language;
    themes: string[];
    youtubeUrl: string | null;
    spotifyUrl: string | null;
    appleMusicUrl: string | null;
  };
  sections: ChordProSection[];
};
