import { Language } from "@/types/common";

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
  uid: string;
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
    /** Bloc {start_of_jianpu}…{end_of_jianpu} brut (partition 简谱 complète) */
    jianpuScore: string | null;
  };
  sections: ChordProSection[];
};
