import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";
import type { ChordProAST, ChordProSection, Token } from "@/types/chordPro";
import { formatSectionName } from "@/lib/chordpro/parser";
import { resolveStructureOverride } from "@/lib/chordpro/structure";
import frTranslations from "@/locales/fr.json";
import zhTranslations from "@/locales/zh-CN.json";

// ─── Fonts ────────────────────────────────────────────────────────────────────

Font.register({
  family: "SpaceGrotesk",
  fonts: [
    { src: "/fonts/SpaceGrotesk-Light.ttf", fontWeight: 300 },
    { src: "/fonts/SpaceGrotesk-Bold.ttf",  fontWeight: 700 },
  ],
});
Font.register({
  family: "Inter",
  fonts: [{ src: "/fonts/Inter-Regular.ttf", fontWeight: 400 }],
});
Font.register({
  family: "LiberationSans",
  fonts: [
    { src: "/fonts/LiberationSans-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/LiberationSans-Bold.ttf",    fontWeight: 700 },
  ],
});
Font.register({
  family: "DejaVuSans",
  fonts: [
    { src: "/fonts/DejaVuSans.ttf",         fontWeight: 400 },
    { src: "/fonts/DejaVuSans-Oblique.ttf", fontWeight: 400, fontStyle: "italic" },
  ],
});
Font.register({
  family: "SourceHanSansCN",
  fonts: [{ src: "/fonts/SourceHanSansCN-Light.ttf", fontWeight: 300 }],
});
Font.register({
  family: "KaiTi",
  fonts: [{ src: "/fonts/KaiTi.ttf", fontWeight: 400 }],
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

// Approximate character widths for line-break pre-computation (no flexWrap)
const LYRIC_CHAR_W = 5.5;   // NotoSans 11pt average glyph advance
const CHORD_CHAR_W = 7.5;   // NotoSans Bold 13pt average glyph advance
const PAGE_CONTENT_W = 495; // A4 - 2×50pt margins

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

/** Split a chord into root note + quality suffix for sized rendering.
 *  Slash chords (e.g. Bb/C) keep both sides at the same size. */
function chordParts(chord: string): [string, string] {
  if (chord.includes("/")) return [chord, ""];
  const m = chord.match(/^([A-G][b#]?)(.*)$/);
  if (!m) return [chord, ""];
  return [m[1], m[2]];
}

function sectionName(section: ChordProSection, uiLang: string): string {
  return formatSectionName(section, uiLang === "zh-CN" ? zhTranslations : frTranslations);
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
// Uses View (not Text) for the container so Yoga respects the fixed height.
// minHeight on <Text> is ignored by react-pdf's text engine — only View height works.

function ChordLabel({ chord, theme }: { chord: string; theme: Theme }) {
  const [root, qual] = chordParts(chord);
  return (
    <View style={{ height: CHORD_H, flexDirection: "row", alignItems: "flex-end" }}>
      <Text style={{ fontFamily: "LiberationSans", fontWeight: 700, color: theme.accent,
                     fontSize: CHORD_SIZE, lineHeight: 1 }}>
        {root}
      </Text>
      
      <Text style={{ fontFamily: "LiberationSans", fontWeight: 700, color: theme.accent,
                      fontSize: CHORD_Q_SIZE, lineHeight: 1 }}>
        {qual ? qual : '\u00A0'}
      </Text>
      
    </View>
  );
}



// ─── French line ──────────────────────────────────────────────────────────────
// Uses explicit line-breaking (no flexWrap) to avoid Yoga's misalignment bug
// with wrapped flex items. Each visual line renders two flat rows: chord + lyric.

function FrLine({ tokens, showChords, theme }: {
  tokens: Token[];
  showChords: boolean;
  theme: Theme;
}) {
  const segs = toSegments(tokens);
  const allEmpty = segs.every(s => !s.lyric?.trim() && !s.chord);
  if (allEmpty) return <View style={{ height: 2 }} />;

  // Per-segment cell width = max(chord width, lyric width)
  const cellWidths = segs.map(seg => {
    const cw = showChords && seg.chord ? (seg.chord.length + 0.5) * CHORD_CHAR_W : 0;
    const lw = [...seg.lyric].length * LYRIC_CHAR_W;
    return Math.max(cw, lw, 4);
  });

  // Split segments into visual lines so nothing overflows the page
  const visualLines: number[][] = [];
  let lineSegs: number[] = [];
  let lineW = 0;
  for (let i = 0; i < segs.length; i++) {
    if (lineW + cellWidths[i] > PAGE_CONTENT_W && lineSegs.length > 0) {
      visualLines.push(lineSegs);
      lineSegs = [i];
      lineW = cellWidths[i];
    } else {
      lineSegs.push(i);
      lineW += cellWidths[i];
    }
  }
  if (lineSegs.length) visualLines.push(lineSegs);
  return (
    <View style={{ marginBottom: 1 }}>
      {visualLines.map((indices, li) => {
        const lineHasChord = showChords && indices.some(i => segs[i].chord !== null);
        return (
          // <View key={li} style={{ marginBottom: li < visualLines.length - 1 ? 3 : 0 }}>
          <View key={li}>
            {/* Chord row — only when this visual line has at least one chord */}
            {lineHasChord && showChords && (
              <View style={{ flexDirection: "row"}}>
                {indices.map(i => (
                  <View key={i} style={showChords?{ minWidth: cellWidths[i] }:{}}>
                    {segs[i].chord
                      ? <ChordLabel chord={segs[i].chord!} theme={theme} />
                      : <View style={{ height: CHORD_H }}>
                        </View>}
                  </View>
                ))}
              </View>
            )}
            {/* Lyric row */}
            <View style={{ flexDirection: "row", alignItems: "flex-start"}}>
              {indices.map(i => {
                const lyric = (showChords ? segs[i].lyric : segs[i].lyric?.trimStart()) || "\u00A0";
                return (
                  <View key={i} style={showChords?{ minWidth: cellWidths[i]}:{}}>
                    <Text style={{ fontSize: LYRIC_FR, color: C.lyric, fontFamily: "Inter", fontWeight: 400, lineHeight: 1.25 }}>
                      {lyric}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Chinese line (chord / char / pinyin) ────────────────────────────────────

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
      if (seg.chord && showChords) cols.push({ char: " ", chord: seg.chord, py: "" });
    } else {
      chars.forEach((ch, ci) => {
        cols.push({ char: ch, chord: ci === 0 ? seg.chord : null, py: isCJK(ch) ? (pyWords[pIdx++] ?? "") : "" });
      });
    }
  }

  // Largeur de cellule basée sur le chord et le type de caractère
  const cellWidth = (chord: string | null, charIsCJK: boolean): number => {
    const fromChord = chord ? (chord.length + 1.5) * 6 : 0;
    const fromChar = charIsCJK ? 16 : 8;
    return Math.max(fromChar, fromChord, 16);
  };
  console.log('cols',cols)
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", marginBottom: 2 }}>
      {cols.map((col, i) => (
        
        <View key={i} style={{ minWidth: cellWidth(col.chord, isCJK(col.char)), flexDirection: "column", alignItems: "center" }}>
          <ChordSmall chord={showChords ? col.chord : null} theme={theme} />
          <Text style={{ fontSize: LYRIC_ZH, color: C.lyric, fontFamily: "SourceHanSansCN", fontWeight: 300, textAlign: "center" }}>
            {col.char}
          </Text>
          {showPinyin && (
            <Text style={{ fontSize: PINYIN_SIZE, color: C.subtitle, fontFamily: "SourceHanSansCN", fontWeight: 300, textAlign: "center" }}>
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
  if (!chord) return <View style={{ height: 16 }} />;
  const [root, qual] = chordParts(chord);
  return (
    <View style={{ height: 16, flexDirection: "row", alignItems: "flex-end", justifyContent: "center" }}>
      <Text style={{ fontFamily: "LiberationSans", fontWeight: 700, color: theme.accent,
                     fontSize: 13, lineHeight: 1 }}>
        {root}
      </Text>
      {qual ? (
        <Text style={{ fontFamily: "LiberationSans", fontWeight: 700, color: theme.accent,
                       fontSize: 10, lineHeight: 1 }}>
          {qual}
        </Text>
      ) : null}
    </View>
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
          <Text style={{ fontSize: JIANPU_SIZE, color: C.jianpu, fontFamily: "SpaceGrotesk",
                         fontWeight: 300, textAlign: "center", minHeight: 14 }}>
            {col.num}
          </Text>
          <Text style={{ fontSize: 12, color: C.lyric, fontFamily: "SourceHanSansCN", fontWeight: 300, textAlign: "center" }}>
            {col.char}
          </Text>
          {showPinyin && (
            <Text style={{ fontSize: PINYIN_SIZE, color: C.subtitle, fontFamily: "SourceHanSansCN", fontWeight: 300, textAlign: "center" }}>
              {col.py || " "}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function TransitionPDFBlock({ text }: { text: string }) {
  const hasCJK = /[一-鿿㐀-䶿]/.test(text);
  return (
    <View style={{
      flexDirection: "row",
      alignItems: "flex-start",
      marginTop: -4,
      marginBottom: 8,
      paddingHorizontal: 8,
      paddingVertical: 5,
      backgroundColor: "#fffbeb",
      borderWidth: 0.5,
      borderColor: "#f59e0b",
      borderStyle: "dashed",
      borderRadius: 4,
    }}>
      <Text style={{ fontSize: 8.5, color: C.lyric, fontFamily: hasCJK ? "SourceHanSansCN" : "SpaceGrotesk", fontWeight: 300 }}>
        {"→ "}{text}
      </Text>
    </View>
  );
}

function SectionBlock({ section, isZh, useJianpu, showChords, showPinyin, note, theme, uiLang, sourceLabel, sourceLabelFont }: {
  section: ChordProSection;
  isZh: boolean;
  useJianpu: boolean;
  showChords: boolean;
  showPinyin: boolean;
  note?: string;
  theme: Theme;
  uiLang: string;
  sourceLabel?: string;
  sourceLabelFont?: string;
}) {
  const labelFont = isZh && uiLang === "zh-CN" ? "SourceHanSansCN" : "SpaceGrotesk";
  const label = sectionName(section, uiLang).toUpperCase();
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
          <Text style={{ fontSize: 7.5, fontWeight: 700, color: theme.accent, fontFamily: labelFont,
                         letterSpacing: 1.4 }}>
            {label}
          </Text>
          {sourceLabel ? (
            <Text style={{ fontSize: 7.5, color: C.subtitle, fontFamily: sourceLabelFont ?? "SpaceGrotesk",
                           fontWeight: 300 }}>
              {sourceLabel}
            </Text>
          ) : null}
        </View>
        {note ? (
          <Text style={{ fontSize: 8.5, color: C.subtitle, fontFamily: labelFont, fontWeight: 300 }}>
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

function OrdreLine({ sections, theme, uiLang, isZh }: {
  sections: ChordProSection[];
  theme: Theme;
  uiLang: string;
  isZh: boolean;
}) {
  const labelFont = isZh && uiLang === "zh-CN" ? "SourceHanSansCN" : "SpaceGrotesk";
  const names = sections.map(s => sectionName(s, uiLang));
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline",
                   marginBottom: 12, marginTop: 2 }}>
      <Text style={{ fontSize: 7.5, fontWeight: 700, color: theme.accent, fontFamily: "SpaceGrotesk",
                     letterSpacing: 1, marginRight: 7, paddingHorizontal: 2 }}>
        ORDRE
      </Text>
      {names.map((name, i) => (
        <Text key={i} style={{ fontSize: 8.5, color: C.subtitle, fontFamily: labelFont, fontWeight: 300 }}>
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
  sectionTransitions?: Record<string, string>;
  /** Optional override for the footer center label (e.g. setlist title). */
  footerCenter?: string;
  language?: string;
}

export function SongPDFPage({
  ast,
  showChords,
  showPinyin,
  useJianpu = false,
  structureOverride = null,
  sectionNotes = {},
  sectionTransitions = {},
  footerCenter,
  language = "fr",
}: SongPDFProps) {
  const isZh = ast.metadata.language === "zh";
  const uiLang = language;
  const canUseJianpu = isZh && useJianpu;
  const theme = isZh ? RED_THEME : BLUE_THEME;
  const { title, titlePinyin, artist, key, jianpuKey, tempo } = ast.metadata;
  const displayKey = canUseJianpu ? (jianpuKey ?? `1=${key}`) : key;

  const sections: ChordProSection[] = (!canUseJianpu && structureOverride && structureOverride.length > 0)
    ? resolveStructureOverride(ast.sections, structureOverride)
    : ast.sections;

  const titleFont = isZh ? "KaiTi" : "SpaceGrotesk";
  const metaFont = isZh ? "SourceHanSansCN" : "SpaceGrotesk";
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
              <Text style={{ fontSize: 11, color: C.subtitle, fontFamily: "SourceHanSansCN", fontWeight: 300,
                             marginBottom: 2 }}>
                {titlePinyin}
              </Text>
            )}
            {artist && (
              <Text style={{ fontSize: 11, color: C.subtitle, fontFamily: metaFont, fontWeight: 300 }}>
                {artist}
              </Text>
            )}
          </View>
          {/* Right: key badge + tempo */}
          <View style={{ alignItems: "flex-end", gap: 5, paddingTop: 2 }}>
            {displayKey && (
              <View style={{ borderWidth: 1.5, borderColor: theme.accent, borderRadius: 20,
                             paddingHorizontal: 12, paddingVertical: 4 }}>
                <Text style={{ fontFamily: "SpaceGrotesk", fontWeight: 700, fontSize: 13,
                               color: theme.accent }}>
                  {displayKey}
                </Text>
              </View>
            )}
            {tempo && (
              <Text style={{ fontFamily: "DejaVuSans", fontSize: 11, color: C.subtitle }}>
                {`♩ = ${tempo}`}
              </Text>
            )}
          </View>
        </View>

        {/* Horizontal rule */}
        <View style={{ height: 0.5, backgroundColor: C.rule, marginTop: 10, marginBottom: 0 }} />
      </View>

      {/* ── ORDRE line ── */}
      <OrdreLine sections={sections} theme={theme} uiLang={uiLang} isZh={isZh} />

      {/* ── Sections ── */}
      {(() => {
        const occ: Record<string, number> = {};
        return sections.flatMap((section, i) => {
          const idx = occ[section.id] ?? 0;
          occ[section.id] = idx + 1;
          const key = idx === 0 ? section.id : `${section.id}:${idx}`;
          const note = sectionNotes[section.uid] ?? sectionNotes[key] ?? sectionNotes[section.id];
          const transition = sectionTransitions[section.uid] ?? sectionTransitions[key] ?? sectionTransitions[section.id];
          const items = [
            <SectionBlock
              key={`${section.uid ?? section.id}-${i}`}
              section={section}
              isZh={isZh}
              useJianpu={canUseJianpu}
              showChords={showChords}
              showPinyin={isZh ? showPinyin : false}
              note={note}
              theme={theme}
              uiLang={uiLang}
            />,
          ];
          if (transition) items.push(<TransitionPDFBlock key={`tr-${section.uid ?? section.id}-${i}`} text={transition} />);
          return items;
        });
      })()}

      {/* ── Footer ── */}
      <View style={styles.footer} fixed>
        <Text style={[styles.footerText, { fontFamily: "LiberationSans", fontWeight: 700,
                       color: theme.accent, letterSpacing: 1 }]}>
          GCC LOUANGE
        </Text>
        <Text style={[styles.footerText, { fontFamily: "LiberationSans", fontWeight: 400 }]}>
          {centerLabel}
        </Text>
        <Text
          style={[styles.footerText, { fontFamily: "LiberationSans", fontWeight: 400 }]}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
      </View>
    </Page>
  );
}

// ─── Fusion page (mixed structure) ───────────────────────────────────────────

export interface FusionPDFSong {
  slug: string;
  ast: ChordProAST;
  sectionNotes: Record<string, string>;
}

export function FusionPDFPage({
  songs,
  mixedStructure,
  showChords,
  footerCenter,
}: {
  songs: FusionPDFSong[];
  mixedStructure: Array<{ songSlug: string; sectionId: string; note?: string; transition?: string }>;
  showChords: boolean;
  footerCenter?: string;
}) {
  const songMap = Object.fromEntries(songs.map((s) => [s.slug, s]));

  const mixedSections = mixedStructure.flatMap((ms) => {
    const song = songMap[ms.songSlug];
    if (!song) return [];
    const section = song.ast.sections.find((s) => s.id === ms.sectionId);
    if (!section) return [];
    const note = ms.note ?? song.sectionNotes?.[ms.sectionId];
    const isZh = song.ast.metadata.language === "zh";
    const sourceLabel = song.ast.metadata.title;
    const sourceLabelFont = isZh ? "KaiTi" : "SpaceGrotesk";
    return [{ section, note, transition: ms.transition, isZh, theme: isZh ? RED_THEME : BLUE_THEME, sourceLabel, sourceLabelFont }];
  });

  if (mixedSections.length === 0) return null;

  const centerLabel = footerCenter ?? songs.map((s) => s.ast.metadata.title).join(" / ");

  // Build flat list of title parts so each Text gets a key (no Fragment needed)
  const titleParts: { text: string; font: string; bold: boolean; key: string }[] = [];
  songs.forEach((s, i) => {
    if (i > 0) titleParts.push({ text: " / ", font: "SpaceGrotesk", bold: false, key: `sep-${i}` });
    titleParts.push({
      text: s.ast.metadata.title,
      font: s.ast.metadata.language === "zh" ? "KaiTi" : "SpaceGrotesk",
      bold: true,
      key: `title-${s.slug}`,
    });
  });

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap" }}>
          {titleParts.map(({ text, font, bold, key }) => (
            <Text key={key} style={{ fontSize: 18, fontWeight: bold ? 700 : 400,
                                     color: bold ? C.title : C.subtitle,
                                     fontFamily: font, lineHeight: 1.2 }}>
              {text}
            </Text>
          ))}
        </View>
        <View style={{ height: 0.5, backgroundColor: C.rule, marginTop: 10, marginBottom: 0 }} />
      </View>

      {mixedSections.flatMap(({ section, note, transition, isZh, theme, sourceLabel, sourceLabelFont }, idx) => {
        const items = [
          <SectionBlock
            key={`${section.id}-${idx}`}
            section={section}
            isZh={isZh}
            useJianpu={false}
            showChords={showChords}
            showPinyin={isZh}
            note={note}
            theme={theme}
            uiLang="fr"
            sourceLabel={sourceLabel}
            sourceLabelFont={sourceLabelFont}
          />,
        ];
        if (transition) items.push(<TransitionPDFBlock key={`tr-${idx}`} text={transition} />);
        return items;
      })}

      <View style={styles.footer} fixed>
        <Text style={[styles.footerText, { fontFamily: "LiberationSans", fontWeight: 700,
                       color: BLUE_THEME.accent, letterSpacing: 1 }]}>
          GCC LOUANGE
        </Text>
        <Text style={[styles.footerText, { fontFamily: "LiberationSans", fontWeight: 400 }]}>
          {centerLabel}
        </Text>
        <Text
          style={[styles.footerText, { fontFamily: "LiberationSans", fontWeight: 400 }]}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
      </View>
    </Page>
  );
}

// ─── Transition page ──────────────────────────────────────────────────────────

export function TransitionPDFPage({ text, footerCenter }: { text: string; footerCenter?: string }) {
  const hasCJK = /[一-鿿㐀-䶿]/.test(text);
  const textFont = hasCJK ? "SourceHanSansCN" : "SpaceGrotesk";

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={{ fontSize: 9, fontWeight: 700, color: C.subtitle, fontFamily: "SpaceGrotesk",
                       letterSpacing: 2 }}>
          TRANSITION
        </Text>
        <View style={{ height: 0.5, backgroundColor: C.rule, marginTop: 8 }} />
      </View>

      <View style={{ marginTop: 28 }}>
        <Text style={{ fontSize: 13, color: C.lyric, fontFamily: textFont, lineHeight: 1.8, fontWeight: 400 }}>
          {text}
        </Text>
      </View>

      <View style={styles.footer} fixed>
        <Text style={[styles.footerText, { fontFamily: "LiberationSans", fontWeight: 700,
                       color: BLUE_THEME.accent, letterSpacing: 1 }]}>
          GCC LOUANGE
        </Text>
        <Text style={[styles.footerText, { fontFamily: "LiberationSans", fontWeight: 400 }]}>
          {footerCenter ?? ""}
        </Text>
        <Text
          style={[styles.footerText, { fontFamily: "LiberationSans", fontWeight: 400 }]}
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
    fontFamily: "Inter",
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
    fontFamily: "LiberationSans",
  },
});
