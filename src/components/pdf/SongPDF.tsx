import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";
import type { ChordProAST, ChordProSection, Token } from "@/types/chordPro";
import { formatSectionName } from "@/lib/chordpro/parser";
import frTranslations from "@/locales/fr.json";

// ─── Fonts ────────────────────────────────────────────────────────────────────

Font.register({
  family: "NotoSans",
  fonts: [
    { src: "/fonts/NotoSans-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/NotoSans-Regular.ttf", fontWeight: 400, fontStyle: "italic" },
    { src: "/fonts/NotoSans-Bold.ttf",    fontWeight: 700 },
    { src: "/fonts/NotoSans-Bold.ttf",    fontWeight: 700, fontStyle: "italic" },
  ],
});
Font.register({
  family: "NotoSansSC",
  fonts: [
    { src: "/fonts/NotoSansSC-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/NotoSansSC-Regular.ttf", fontWeight: 700 }, // fallback same file
  ],
});
Font.register({
  family: "KaiTi",
  fonts: [{ src: "/fonts/KaiTi.ttf", fontWeight: 400 }],
});
// Arial Unicode covers musical symbols (♩ U+2669) missing in NotoSans
Font.register({
  family: "ArialUnicode",
  fonts: [{ src: "/fonts/ArialUnicode.ttf", fontWeight: 400 }],
});

// ─── Theme ────────────────────────────────────────────────────────────────────

type Theme = {
  accent: string;
  boxFill: string;
  boxBorder: string;
};

const BLUE_THEME: Theme = {
  accent:    "#3f63cf",
  boxFill:   "#e2e7f7",
  boxBorder: "#c5cee8",
};

const RED_THEME: Theme = {
  accent:    "#b3261d",
  boxFill:   "#fbeae9",
  boxBorder: "#e5c4c2",
};

// ─── Shared color palette ─────────────────────────────────────────────────────

const C = {
  title:    "#1f3540",
  subtitle: "#5b6b73",
  lyric:    "#222b30",
  jianpu:   "#b3261d",
  footer:   "#8a9aa5",
  rule:     "#d0d8dd",
} as const;

// ─── Shared sizes ─────────────────────────────────────────────────────────────

const CHORD_SIZE   = 13;    // ≈17px on screen (user spec)
const CHORD_Q_SIZE = 10;    // quality suffix (m, sus4, /F#…)
const LYRIC_FR     = 11;    // ≈15px
const LYRIC_ZH     = 11;    // ≈15px on screen (user spec)
const PINYIN_SIZE  = 8;
const JIANPU_SIZE  = 11;
const CHORD_H      = 16;    // reserved height for chord row

// ─── Section box type ─────────────────────────────────────────────────────────

type BoxStyle = "filled" | "outline" | "none";

const SECTION_BOX: Record<string, BoxStyle> = {
  chorus:       "filled",
  prechorus:    "filled",
  intro:        "none",
  final:        "filled",
  coda:         "filled",
  bridge:       "outline",
  verse:        "none",
  outro:        "none",
  other:        "none",
  instrumental: "none",
  interlude:    "none",
  tag:          "none",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isCJK(ch: string) {
  const cp = ch.codePointAt(0) ?? 0;
  return (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf);
}

/** Split a chord into root note + quality suffix for sized rendering. */
function chordParts(chord: string): [string, string] {
  const m = chord.match(/^([A-G][b#]?)(.*)$/);
  if (!m) return [chord, ""];
  return [m[1], m[2]];
}

/** Extract the French/primary part of a possibly bilingual section name. */
function primaryName(section: ChordProSection): string {
  return formatSectionName(section, frTranslations);
}

type Seg = { chord: string | null; lyric: string };

function toSegments(tokens: Token[]): Seg[] {
  const out: Seg[] = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.type === "chord") {
      const chord = tok.value;
      let lyric = "";
      i++;
      while (i < tokens.length && tokens[i].type === "lyric") {
        lyric += tokens[i].value;
        i++;
      }
      const sp = lyric.search(/\s/);
      if (sp === -1 || sp === lyric.length - 1) {
        out.push({ chord, lyric });
      } else {
        out.push({ chord, lyric: lyric.slice(0, sp + 1) });
        lyric.slice(sp + 1).split(/(?<=\s)/).forEach(w => w && out.push({ chord: null, lyric: w }));
      }
    } else {
      tok.value.split(/(?<=\s)/).forEach(w => w && out.push({ chord: null, lyric: w }));
      i++;
    }
  }
  return out;
}

// ─── Chord label (root + smaller quality) ────────────────────────────────────

function ChordLabel({ chord, theme }: { chord: string; theme: Theme }) {
  const [root, qual] = chordParts(chord);
  return (
    <Text style={{ fontFamily: "NotoSans", fontWeight: 700, color: theme.accent,
                   fontSize: CHORD_SIZE, lineHeight: 1, minHeight: CHORD_H }}>
      {root}
      {qual ? <Text style={{ fontSize: CHORD_Q_SIZE }}>{qual}</Text> : null}
    </Text>
  );
}

// ─── French line ──────────────────────────────────────────────────────────────

function FrLine({ tokens, showChords, theme }: {
  tokens: Token[];
  showChords: boolean;
  theme: Theme;
}) {
  const segs = toSegments(tokens);
  const hasChord = showChords && segs.some(s => s.chord !== null);
  const allEmpty = segs.every(s => !s.lyric?.trim() && !s.chord);

  if (allEmpty && !hasChord) return <View style={{ height: 6 }} />;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", marginBottom: 1 }}>
      {segs.map((seg, i) => {
        const chordLen = seg.chord?.length ?? 0;
        const lyricLen = [...seg.lyric].length;
        // 1 ch ≈ 5.5pt pour fontSize 14
        const minWidth = hasChord && chordLen > lyricLen ? (chordLen + 0.5) * 5.5 : undefined;
        return (
          <View key={i} style={[{ flexDirection: "column" }, minWidth ? { minWidth } : {}]}>
            {showChords && seg.chord
              ? <ChordLabel chord={seg.chord} theme={theme} />
              : hasChord
                ? <Text style={{ fontSize: CHORD_SIZE, minHeight: CHORD_H }}>{""}</Text>
                : null}
            <Text style={{ fontSize: LYRIC_FR, color: C.lyric, fontFamily: "NotoSans", lineHeight: 1.25 }}>
              {(showChords ? seg.lyric : seg.lyric?.trimStart()) || (seg.chord && showChords ? " " : "")}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Chinese line (chord / char / pinyin) ────────────────────────────────────

const ZH_CELL_BASE = 16;  // minimum column width
const ZH_CHAR_W   = 7.5;  // approx pt per root char at CHORD_SIZE
const ZH_QUAL_W   = 5.8;  // approx pt per quality char

/** Estimated rendered width of a chord in a ZH column (pt). */
function chordPtWidth(chord: string): number {
  const [root, qual] = chordParts(chord);
  return root.length * ZH_CHAR_W + qual.length * ZH_QUAL_W + 2;
}

function ZhLine({ tokens, pinyin, showChords, showPinyin, theme }: {
  tokens: Token[];
  pinyin: string | null;
  showChords: boolean;
  showPinyin: boolean;
  theme: Theme;
}) {
  const pyWords = pinyin?.split(/\s+/).filter(Boolean) ?? [];
  let pIdx = 0;

  type Col = { char: string; chord: string | null; py: string };
  const cols: Col[] = [];

  for (const seg of toSegments(tokens)) {
    const chars = [...(showChords ? seg.lyric : (seg.lyric?.trimStart() ?? ""))];
    if (chars.length === 0) {
      if (seg.chord) cols.push({ char: " ", chord: seg.chord, py: "" });
    } else {
      chars.forEach((ch, ci) => {
        cols.push({ char: ch, chord: ci === 0 ? seg.chord : null, py: isCJK(ch) ? (pyWords[pIdx++] ?? "") : "" });
      });
    }
  }

  // Largeur de cellule : min 20pt, s'étend si l'accord est plus large (5.2pt par char à 13pt)
  const cellWidth = (chord: string | null) =>
    chord ? Math.max(20, Math.min(42, (chord.length + 0.5) * 5.2)) : 20;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", marginBottom: 2 }}>
      {cols.map((col, i) => (
        <View key={i} style={{ minWidth: cellWidth(col.chord), flexDirection: "column", alignItems: "center" }}>
          <ChordSmall chord={showChords ? col.chord : null} theme={theme} />
          <Text style={{ fontSize: LYRIC_ZH, color: C.lyric, fontFamily: "NotoSansSC", textAlign: "center" }}>
            {col.char}
          </Text>
          {showPinyin && (
            <Text style={{ fontSize: PINYIN_SIZE, color: C.subtitle, fontFamily: "NotoSans", textAlign: "center" }}>
              {col.py || " "}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

/** Compact chord label for Chinese cell headers (smaller font). */
function ChordSmall({ chord, theme }: { chord: string | null; theme: Theme }) {
  if (!chord) return <Text style={{ fontSize: 13, minHeight: 16 }}>{""}</Text>;
  const [root, qual] = chordParts(chord);
  return (
    <Text style={{ fontFamily: "NotoSans", fontWeight: 700, color: theme.accent,
                   fontSize: 13, minHeight: 16, lineHeight: 1, textAlign: "center" }}>
      {root}{qual ? <Text style={{ fontSize: 10 }}>{qual}</Text> : null}
    </Text>
  );
}

// ─── Jianpu line (chord / number / char / pinyin) ────────────────────────────

const JP_CELL = 17;

function JianpuLine({ tokens, jianpu, pinyin, showChords, showPinyin, theme }: {
  tokens: Token[];
  jianpu: string | null;
  pinyin: string | null;
  showChords: boolean;
  showPinyin: boolean;
  theme: Theme;
}) {
  const jpNums = jianpu?.split(/\s+/).filter(Boolean) ?? [];
  const pyWords = pinyin?.split(/\s+/).filter(Boolean) ?? [];
  let jIdx = 0, pIdx = 0;

  type Col = { char: string; chord: string | null; num: string; py: string };
  const cols: Col[] = [];

  for (const seg of toSegments(tokens)) {
    const chars = [...seg.lyric];
    if (chars.length === 0) {
      cols.push({ char: " ", chord: seg.chord, num: "", py: "" });
    } else {
      chars.forEach((ch, ci) => {
        const cjk = isCJK(ch);
        cols.push({ char: ch, chord: ci === 0 ? seg.chord : null,
                    num: cjk ? (jpNums[jIdx++] ?? "") : "",
                    py: cjk ? (pyWords[pIdx++] ?? "") : "" });
      });
    }
  }

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", marginBottom: 2 }}>
      {cols.map((col, i) => (
        <View key={i} style={{ width: JP_CELL, flexDirection: "column", alignItems: "center" }}>
          {showChords && <ChordSmall chord={col.chord} theme={theme} />}
          <Text style={{ fontSize: JIANPU_SIZE, color: C.jianpu, fontFamily: "NotoSans",
                         fontWeight: 700, textAlign: "center", minHeight: 14 }}>
            {col.num}
          </Text>
          <Text style={{ fontSize: 12, color: C.lyric, fontFamily: "NotoSansSC", textAlign: "center" }}>
            {col.char}
          </Text>
          {showPinyin && (
            <Text style={{ fontSize: PINYIN_SIZE, color: C.subtitle, fontFamily: "NotoSans", textAlign: "center" }}>
              {col.py || " "}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function SectionBlock({ section, isZh, useJianpu, showChords, showPinyin, note, theme }: {
  section: ChordProSection;
  isZh: boolean;
  useJianpu: boolean;
  showChords: boolean;
  showPinyin: boolean;
  note?: string;
  theme: Theme;
}) {
  const label = primaryName(section).toUpperCase();
  const boxType: BoxStyle = SECTION_BOX[section.type] ?? "none";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boxView: any = boxType === "filled"
    ? {
        borderTopWidth: 0.5,   borderTopColor: theme.boxBorder,
        borderRightWidth: 0.5, borderRightColor: theme.boxBorder,
        borderBottomWidth: 0.5,borderBottomColor: theme.boxBorder,
        borderLeftWidth: 3,    borderLeftColor: theme.accent,
        borderRadius: 6,
        backgroundColor: theme.boxFill,
        padding: 10,
        paddingLeft: 12,
        marginBottom: 10,
      }
    : boxType === "outline"
      ? {
          borderTopWidth: 0.5,   borderTopColor: theme.accent,
          borderRightWidth: 0.5, borderRightColor: theme.accent,
          borderBottomWidth: 0.5,borderBottomColor: theme.accent,
          borderLeftWidth: 3,    borderLeftColor: theme.accent,
          borderRadius: 6,
          padding: 10,
          paddingLeft: 12,
          marginBottom: 10,
        }
      : { marginBottom: 9 };

  return (
    <View style={boxView} wrap={false}>
      {/* Section label row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                     marginBottom: 5 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <View style={{ width: 11, height: 1.5, backgroundColor: theme.accent }} />
          <Text style={{ fontSize: 7.5, fontWeight: 700, color: theme.accent, fontFamily: "NotoSans",
                         letterSpacing: 1.4 }}>
            {label}
          </Text>
        </View>
        {note ? (
          <Text style={{ fontSize: 8.5, color: C.subtitle, fontFamily: "NotoSans" }}>
            {note}
          </Text>
        ) : null}
      </View>

      {/* Lines */}
      <View>
        {section.lines.map((line, li) => {
          if (line.tokens.length === 0 && !line.jianpu) {
            return <View key={li} style={{ height: 5 }} />;
          }
          if (isZh && useJianpu) {
            return (
              <JianpuLine key={li} tokens={line.tokens} jianpu={line.jianpu} pinyin={line.pinyin}
                          showChords={showChords} showPinyin={showPinyin} theme={theme} />
            );
          }
          if (isZh) {
            return (
              <ZhLine key={li} tokens={line.tokens} pinyin={line.pinyin}
                      showChords={showChords} showPinyin={showPinyin} theme={theme} />
            );
          }
          return <FrLine key={li} tokens={line.tokens} showChords={showChords} theme={theme} />;
        })}
      </View>
    </View>
  );
}

// ─── ORDRE line ───────────────────────────────────────────────────────────────

function OrdreLine({ sections, theme }: { sections: ChordProSection[]; theme: Theme }) {
  const names = sections.map(s => primaryName(s));
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline",
                   marginBottom: 12, marginTop: 2 }}>
      <Text style={{ fontSize: 7.5, fontWeight: 700, color: theme.accent, fontFamily: "NotoSans",
                     letterSpacing: 1, marginRight: 7,paddingHorizontal: 2 }}>
        ORDRE
      </Text>
      {names.map((name, i) => (
        <Text key={i} style={{ fontSize: 8.5, color: C.subtitle, fontFamily: "NotoSans" }}>
          {i > 0 ? " · " : ""}{name}
        </Text>
      ))}
    </View>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export interface SongPDFProps {
  ast: ChordProAST;
  showChords: boolean;
  showPinyin: boolean;
  useJianpu?: boolean;
  structureOverride?: string[] | null;
  sectionNotes?: Record<string, string>;
  /** Optional override for the footer center label (e.g. setlist title). */
  footerCenter?: string;
  language?: string; // UI language — unused, theme derived from song language
}

export function SongPDFPage({
  ast,
  showChords,
  showPinyin,
  useJianpu = false,
  structureOverride = null,
  sectionNotes = {},
  footerCenter,
}: SongPDFProps) {
  const isZh = ast.metadata.language === "zh";
  const canUseJianpu = isZh && useJianpu;
  const theme = isZh ? RED_THEME : BLUE_THEME;
  const { title, titlePinyin, artist, key, jianpuKey, tempo } = ast.metadata;

  const displayKey = canUseJianpu ? (jianpuKey ?? `1=${key}`) : key;

  const sections: ChordProSection[] = (!canUseJianpu && structureOverride)
    ? structureOverride
        .map((uid) => {
            const section = ast.sections.find((s) => s.id === uid.replace(/-\d+$/, ""));
            return section ? { ...section, uid } : undefined;
          })
        .filter((s): s is ChordProSection => s !== undefined)
    : ast.sections;

  const titleFont = isZh ? "KaiTi" : "NotoSans";
  const centerLabel = footerCenter ?? title;
  return (
    <Page size="A4" style={styles.page}>

      {/* ── Header ── */}
      <View style={styles.header}>
        {/* Top row: title + key badge */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          {/* Left: title block */}
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={{ fontSize: 26, fontWeight: 700, color: C.title,
                           fontFamily: titleFont, lineHeight: 1.1, marginBottom: 2 }}>
              {title}
            </Text>
            {titlePinyin && (
              <Text style={{ fontSize: 11, color: C.subtitle, fontFamily: "NotoSans",
                             marginBottom: 2 }}>
                {titlePinyin}
              </Text>
            )}
            {artist && (
              <Text style={{ fontSize: 11, color: C.subtitle, fontFamily: "NotoSans" }}>
                {artist}
              </Text>
            )}
          </View>
          {/* Right: key badge + tempo */}
          <View style={{ alignItems: "flex-end", gap: 5, paddingTop: 2 }}>
            {displayKey && (
              <View style={{ borderWidth: 1.5, borderColor: theme.accent, borderRadius: 20,
                             paddingHorizontal: 12, paddingVertical: 4 }}>
                <Text style={{ fontFamily: "NotoSans", fontWeight: 700, fontSize: 13,
                               color: theme.accent }}>
                  {displayKey}
                </Text>
              </View>
            )}
            {tempo && (
              <Text style={{ fontFamily: "NotoSans", fontSize: 11, color: C.subtitle }}>
                <Text style={{ fontFamily: "ArialUnicode" }}>♩</Text>
                {` = ${tempo}`}
              </Text>
            )}
          </View>
        </View>

        {/* Horizontal rule */}
        <View style={{ height: 0.5, backgroundColor: C.rule, marginTop: 10, marginBottom: 0 }} />
      </View>

      {/* ── ORDRE line ── */}
      <OrdreLine sections={sections} theme={theme} />

      {/* ── Sections ── */}
      {sections.map((section, i) => (
        <SectionBlock
          key={`${section.id}-${i}`}
          section={section}
          isZh={isZh}
          useJianpu={canUseJianpu}
          showChords={showChords}
          showPinyin={isZh ? showPinyin : false}
          note={sectionNotes[section.uid]}
          theme={theme}
        />
      ))}

      {/* ── Footer ── */}
      <View style={styles.footer} fixed>
        <Text style={[styles.footerText, { color: theme.accent, fontWeight: 700, letterSpacing: 1 }]}>
          GCC LOUANGE
        </Text>
        <Text style={[styles.footerText, { fontFamily: isZh ? "KaiTi" : "NotoSans" }]}>
          {centerLabel}{artist ? `  ·  ${artist}` : ""}
        </Text>
        <Text
          style={styles.footerText}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
      </View>
    </Page>
  );
}

// ─── Document ─────────────────────────────────────────────────────────────────

export function SongPDF(props: SongPDFProps) {
  const { title, artist } = props.ast.metadata;
  return (
    <Document title={title} author={artist ?? ""}>
      <SongPDFPage {...props} />
    </Document>
  );
}

// ─── Static styles (theme-independent) ───────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 46,
    paddingHorizontal: 50,
    backgroundColor: "#fff",
    fontFamily: "NotoSans",
  },
  header: {
    marginBottom: 0,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: C.rule,
    paddingTop: 5,
  },
  footerText: {
    fontSize: 7.5,
    color: C.footer,
    fontFamily: "NotoSans",
  },
});
