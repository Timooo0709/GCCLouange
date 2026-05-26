import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";
import type { ChordProAST, ChordProSection, Token } from "@/lib/types";
import frTranslations from "@/locales/fr.json";
import zhTranslations from "@/locales/zh-CN.json";

// ─── Fonts ───────────────────────────────────────────────────────────────────

Font.register({
  family: "NotoSans",
  fonts: [
    { src: "/fonts/NotoSans-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/NotoSans-Bold.ttf",    fontWeight: 700 },
  ],
});
Font.register({
  family: "NotoSansSC",
  fonts: [
    { src: "/fonts/NotoSansSC-Regular.ttf", fontWeight: 400 },
  ],
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const ORANGE  = "#EA580C";
const BLUE    = "#2563EB";
const RED     = "#B91C1C";
const GRAY    = "#6b7280";
const LGRAY   = "#d1d5db";
const BLACK   = "#111827";

const s = StyleSheet.create({
  page:         { paddingTop: 40, paddingBottom: 50, paddingHorizontal: 52, backgroundColor: "#fff" },
  // header
  header:       { marginBottom: 12, paddingBottom: 9, borderBottomWidth: 0.5, borderBottomColor: LGRAY },
  title:        { fontSize: 18, fontWeight: 700, color: BLACK, marginBottom: 2, fontFamily: "NotoSans" },
  titlePinyin:  { fontSize: 9,  color: GRAY, marginBottom: 2, fontFamily: "NotoSans" },
  metaRow:      { flexDirection: "row", gap: 12 },
  metaChip:     { fontSize: 9, color: GRAY, fontFamily: "NotoSans" },
  keyChip:      { fontSize: 9, color: BLACK, fontFamily: "NotoSans", fontWeight: 700 },
  // section
  section:      { marginBottom: 12 },
  sectionLabel: { fontSize: 7, fontWeight: 700, color: ORANGE, letterSpacing: 1.2,
                  textTransform: "uppercase", marginBottom: 4, fontFamily: "NotoSans" },
  sectionNote:  { fontSize: 7, color: GRAY, fontFamily: "NotoSans", marginBottom: 4 },
  // lines
  line:         { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", marginBottom: 1 },
  seg:          { flexDirection: "column" },
  chordText:    { fontSize: 8, color: BLUE, fontWeight: 700, fontFamily: "NotoSans", minHeight: 11 },
  lyricFr:      { fontSize: 10.5, color: BLACK, fontFamily: "NotoSans" },
  lyricZh:      { fontSize: 11,   color: BLACK, fontFamily: "NotoSansSC" },
  jianpuText:   { fontSize: 9,    color: RED,   fontFamily: "NotoSans", fontWeight: 700 },
  pinyinText:   { fontSize: 6.5,  color: GRAY,  fontFamily: "NotoSans", marginTop: 0.5 },
  spacer:       { height: 4 },
  // footer
  footer:       { position: "absolute", bottom: 20, left: 52, right: 52,
                  flexDirection: "row", justifyContent: "space-between" },
  footerText:   { fontSize: 7, color: GRAY, fontFamily: "NotoSans" },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Seg = { chord: string | null; lyric: string };

function toSegments(tokens: Token[]): Seg[] {
  const out: Seg[] = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.type === "chord") {
      let lyric = "";
      i++;
      while (i < tokens.length && tokens[i].type === "lyric") {
        lyric += tokens[i].value; i++;
      }
      out.push({ chord: tok.value, lyric });
    } else {
      out.push({ chord: null, lyric: tok.value }); i++;
    }
  }
  return out;
}

function isCJK(ch: string) {
  const cp = ch.codePointAt(0) ?? 0;
  return (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf);
}

// Section labels are loaded dynamically from translation resource files

// ─── French line ──────────────────────────────────────────────────────────────

function FrLine({ tokens, showChords }: { tokens: Token[]; showChords: boolean }) {
  const segs = toSegments(tokens);
  const hasChords = showChords && segs.some((g) => g.chord !== null);

  return (
    <View style={s.line}>
      {segs.map((seg, i) => {
        const cLen = seg.chord?.length ?? 0;
        const lLen = seg.lyric.length;
        // Approx: chord 8pt ~ 5pt/ch, lyric 10.5pt ~ 6pt/ch
        const minWidth =
          hasChords && cLen * 5 > lLen * 6 ? cLen * 5 + 2 : undefined;
        return (
          <View key={i} style={[s.seg, minWidth ? { minWidth } : {}]}>
            {showChords && (
              <Text style={s.chordText}>{seg.chord ?? ""}</Text>
            )}
            <Text style={s.lyricFr}>
              {seg.lyric || (seg.chord && showChords ? "  " : "")}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Chinese line ─────────────────────────────────────────────────────────────

function ZhLine({ tokens, pinyin, showChords, showPinyin }: {
  tokens: Token[];
  pinyin: string | null;
  showChords: boolean;
  showPinyin: boolean;
}) {
  const pinyinWords = pinyin?.split(/\s+/).filter(Boolean) ?? [];
  let pIdx = 0;

  type Col = { char: string; chord: string | null; py: string };
  const cols: Col[] = [];

  for (const seg of toSegments(tokens)) {
    const chars = [...seg.lyric];
    if (chars.length === 0) {
      cols.push({ char: " ", chord: seg.chord, py: "" });
    } else {
      chars.forEach((ch, ci) => {
        cols.push({
          char: ch,
          chord: ci === 0 ? seg.chord : null,
          py: isCJK(ch) ? (pinyinWords[pIdx++] ?? "") : "",
        });
      });
    }
  }

  const CELL = 16;
  return (
    <View style={s.line}>
      {cols.map((col, i) => (
        <View key={i} style={[s.seg, { width: CELL, alignItems: "center" }]}>
          {showChords && (
            <Text style={[s.chordText, { fontSize: 7, minHeight: 10 }]}>
              {col.chord ?? ""}
            </Text>
          )}
          <Text style={[s.lyricZh, { textAlign: "center" }]}>{col.char}</Text>
          {showPinyin && (
            <Text style={[s.pinyinText, { textAlign: "center" }]}>{col.py}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Jianpu line (chord / number / char / pinyin) ────────────────────────────

function JianpuPDFLine({ tokens, jianpu, pinyin, showChords, showPinyin }: {
  tokens: Token[];
  jianpu: string | null;
  pinyin: string | null;
  showChords: boolean;
  showPinyin: boolean;
}) {
  const jianpuTokens = jianpu?.split(/\s+/).filter(Boolean) ?? [];
  const pinyinWords = pinyin?.split(/\s+/).filter(Boolean) ?? [];
  let jIdx = 0;
  let pIdx = 0;

  type Col = { char: string; chord: string | null; num: string; py: string };
  const cols: Col[] = [];

  for (const seg of toSegments(tokens)) {
    const chars = [...seg.lyric];
    if (chars.length === 0) {
      cols.push({ char: " ", chord: seg.chord, num: "", py: "" });
    } else {
      chars.forEach((ch, ci) => {
        const cjk = isCJK(ch);
        cols.push({
          char: ch,
          chord: ci === 0 ? seg.chord : null,
          num: cjk ? (jianpuTokens[jIdx++] ?? "") : "",
          py: cjk ? (pinyinWords[pIdx++] ?? "") : "",
        });
      });
    }
  }

  const CELL = 16;
  return (
    <View style={s.line}>
      {cols.map((col, i) => (
        <View key={i} style={[s.seg, { width: CELL, alignItems: "center" }]}>
          {showChords && (
            <Text style={[s.chordText, { fontSize: 7, minHeight: 10 }]}>
              {col.chord ?? ""}
            </Text>
          )}
          <Text style={[s.jianpuText, { textAlign: "center", minHeight: 11 }]}>{col.num}</Text>
          <Text style={[s.lyricZh, { textAlign: "center" }]}>{col.char}</Text>
          {showPinyin && (
            <Text style={[s.pinyinText, { textAlign: "center" }]}>{col.py}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function SectionView({ section, isZh, useJianpu, showChords, showPinyin, note, language = "fr" }: {
  section: ChordProSection;
  isZh: boolean;
  useJianpu: boolean;
  showChords: boolean;
  showPinyin: boolean;
  note?: string;
  language?: string;
}) {
  const locales: Record<string, any> = language === "zh-CN" ? zhTranslations : frTranslations;
  const sectionsObj = locales.songs?.sections ?? {};
  const label = section.name || sectionsObj[section.type] || section.type;
  return (
    <View style={s.section} wrap={false}>
      <Text style={s.sectionLabel}>{label.toUpperCase()}</Text>
      {note ? <Text style={s.sectionNote}>— {note}</Text> : null}
      {section.lines.map((line, li) => {
        if (line.tokens.length === 0) return <View key={li} style={s.spacer} />;
        if (isZh && useJianpu) {
          return (
            <JianpuPDFLine
              key={li}
              tokens={line.tokens}
              jianpu={line.jianpu}
              pinyin={line.pinyin}
              showChords={showChords}
              showPinyin={showPinyin}
            />
          );
        }
        if (isZh) {
          return (
            <ZhLine
              key={li}
              tokens={line.tokens}
              pinyin={line.pinyin}
              showChords={showChords}
              showPinyin={showPinyin}
            />
          );
        }
        return <FrLine key={li} tokens={line.tokens} showChords={showChords} />;
      })}
    </View>
  );
}

// ─── Page & Document ─────────────────────────────────────────────────────────

export interface SongPDFProps {
  ast: ChordProAST;
  showChords: boolean;
  showPinyin: boolean;
  useJianpu?: boolean;
  structureOverride?: string[] | null;
  sectionNotes?: Record<string, string>;
  language?: string;
}

export function SongPDFPage({
  ast,
  showChords,
  showPinyin,
  useJianpu = false,
  structureOverride = null,
  sectionNotes = {},
  language = "fr",
}: SongPDFProps) {
  const isZh = ast.metadata.language === "zh";
  const canUseJianpu = isZh && useJianpu;
  const { title, titlePinyin, artist, key, tempo } = ast.metadata;

  const sections = (!canUseJianpu && structureOverride)
    ? structureOverride
        .map((id) => ast.sections.find((sec) => sec.id === id))
        .filter((sec): sec is ChordProSection => sec !== undefined)
    : ast.sections;

  return (
    <Page size="A4" style={s.page}>
      <View style={s.header}>
        <Text style={s.title}>{title}</Text>
        {titlePinyin ? <Text style={s.titlePinyin}>{titlePinyin}</Text> : null}
        <View style={s.metaRow}>
          <Text style={s.keyChip}>{key}</Text>
          {artist ? <Text style={s.metaChip}>{artist}</Text> : null}
          {tempo ? <Text style={s.metaChip}>♩ = {tempo}</Text> : null}
        </View>
      </View>

      {sections.map((section, i) => (
        <SectionView
          key={`${section.id}-${i}`}
          section={section}
          isZh={isZh}
          useJianpu={canUseJianpu}
          showChords={showChords}
          showPinyin={isZh ? showPinyin : false}
          note={sectionNotes[section.id]}
          language={language}
        />
      ))}

      <View style={s.footer} fixed>
        <Text style={s.footerText}>GCC Louange</Text>
        <Text
          style={s.footerText}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </View>
    </Page>
  );
}

export function SongPDF(props: SongPDFProps) {
  const { title, artist } = props.ast.metadata;
  return (
    <Document title={title} author={artist ?? ""}>
      <SongPDFPage {...props} />
    </Document>
  );
}
