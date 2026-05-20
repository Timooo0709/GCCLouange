import type {
  ChordProAST,
  ChordProLine,
  ChordProSection,
  Language,
  Token,
} from "@/lib/types";

// --- Parsing des directives {key: value} ---

function parseDirective(line: string): { key: string; value: string } | null {
  const match = line.match(/^\{(\w+)(?::\s*(.*?))?\s*\}$/);
  if (!match) return null;
  return { key: match[1], value: match[2] ?? "" };
}

// --- Parsing d'une ligne de paroles avec accords ---

function parseLyricLine(rawLine: string): { tokens: Token[]; pinyin: string | null } {
  // Séparation paroles chinoises / pinyin (3 espaces minimum)
  let pinyinPart: string | null = null;
  let lyricPart = rawLine;

  const pinyinMatch = rawLine.match(/^(.*?)\s{3,}(.+)$/);
  if (pinyinMatch) {
    lyricPart = pinyinMatch[1];
    pinyinPart = pinyinMatch[2].trim() || null;
  }

  // Tokenisation : alternance de [accord] et texte
  const tokens: Token[] = [];
  const regex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(lyricPart)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "lyric", value: lyricPart.slice(lastIndex, match.index) });
    }
    tokens.push({ type: "chord", value: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < lyricPart.length) {
    tokens.push({ type: "lyric", value: lyricPart.slice(lastIndex) });
  }

  return { tokens, pinyin: pinyinPart };
}

// --- Mapping type de section ---

const SECTION_TYPE_MAP: Record<string, ChordProSection["type"]> = {
  verse: "verse",
  chorus: "chorus",
  bridge: "bridge",
  intro: "intro",
  outro: "outro",
  prechorus: "prechorus",
  pre_chorus: "prechorus",
  tab: "other",
  grid: "other",
};

function sectionType(key: string): ChordProSection["type"] {
  return SECTION_TYPE_MAP[key] ?? "other";
}

// --- Parser principal ---

export function parseChordPro(source: string): ChordProAST {
  const lines = source.split("\n");

  const metadata: ChordProAST["metadata"] = {
    title: "Sans titre",
    titlePinyin: null,
    artist: "Inconnu",
    key: "C",
    jianpuKey: null,
    tempo: null,
    language: "fr",
    themes: [],
    youtubeUrl: null,
    spotifyUrl: null,
    appleMusicUrl: null,
  };

  const sections: ChordProSection[] = [];
  let currentSection: ChordProSection | null = null;
  let pendingJianpu: string | null = null;
  let sectionCounter = 0;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Ligne vide
    if (!line.trim()) continue;

    const trimmed = line.trim();

    // Ligne directive
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const directive = parseDirective(trimmed);
      if (!directive) continue;

      const { key, value } = directive;

      // Début de section
      if (key.startsWith("start_of_")) {
        const typeKey = key.replace("start_of_", "");
        sectionCounter++;
        currentSection = {
          type: sectionType(typeKey),
          id: `${typeKey}-${sectionCounter}`,
          name: value || typeKey,
          lines: [],
        };
        continue;
      }

      // Fin de section
      if (key.startsWith("end_of_")) {
        if (currentSection) {
          sections.push(currentSection);
          currentSection = null;
        }
        continue;
      }

      // Directive jianpu (à associer à la prochaine ligne de paroles)
      if (key === "jianpu") {
        pendingJianpu = value;
        continue;
      }

      // Métadonnées
      switch (key) {
        case "title":
          metadata.title = value;
          break;
        case "title_pinyin":
          metadata.titlePinyin = value || null;
          break;
        case "artist":
          metadata.artist = value;
          break;
        case "key":
          metadata.key = value;
          break;
        case "jianpu_key":
          metadata.jianpuKey = value || null;
          break;
        case "tempo":
          metadata.tempo = value ? parseInt(value, 10) : null;
          break;
        case "language":
          metadata.language = (value as Language) || "fr";
          break;
        case "themes":
          metadata.themes = value
            ? value.split(",").map((t) => t.trim()).filter(Boolean)
            : [];
          break;
        case "youtube":
          metadata.youtubeUrl = value || null;
          break;
        case "spotify":
          metadata.spotifyUrl = value || null;
          break;
        case "apple_music":
          metadata.appleMusicUrl = value || null;
          break;
        // Directives connues à ignorer silencieusement
        case "c":
        case "comment":
        case "needs_review":
        case "import_source":
          break;
      }
      continue;
    }

    // Ligne de paroles (dans une section)
    if (currentSection) {
      const { tokens, pinyin } = parseLyricLine(trimmed);
      const chordLine: ChordProLine = {
        type: "line",
        tokens,
        pinyin,
        jianpu: pendingJianpu,
      };
      currentSection.lines.push(chordLine);
      pendingJianpu = null;
    }
  }

  // Section non fermée explicitement
  if (currentSection) {
    sections.push(currentSection);
  }

  return { metadata, sections };
}
