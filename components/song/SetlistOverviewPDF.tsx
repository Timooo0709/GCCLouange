import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";
import type { FSSetlist } from "@/lib/firebase/setlists";
import type { SongIndexEntry } from "@/lib/types";
import frTranslations from "@/locales/fr.json";
import zhTranslations from "@/locales/zh-CN.json";

Font.register({
  family: "NotoSans",
  fonts: [
    { src: "/fonts/NotoSans-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/NotoSans-Bold.ttf",    fontWeight: 700 },
  ],
});
Font.register({
  family: "NotoSansSC",
  fonts: [{ src: "/fonts/NotoSansSC-Regular.ttf", fontWeight: 400 }],
});

const ORANGE = "#EA580C";
const BLUE   = "#2563EB";
const GRAY   = "#6b7280";
const LGRAY  = "#d1d5db";
const BLACK  = "#111827";

const s = StyleSheet.create({
  page:         { paddingTop: 44, paddingBottom: 50, paddingHorizontal: 52, backgroundColor: "#fff" },
  header:       { marginBottom: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: LGRAY },
  title:        { fontSize: 20, fontWeight: 700, color: BLACK, marginBottom: 3, fontFamily: "NotoSans" },
  subtitle:     { fontSize: 10, color: GRAY, fontFamily: "NotoSans", marginBottom: 2 },
  metaRow:      { flexDirection: "row", gap: 10, marginTop: 4 },
  metaChip:     { fontSize: 9, color: GRAY, fontFamily: "NotoSans" },
  sectionLabel: { fontSize: 8, fontWeight: 700, color: ORANGE, letterSpacing: 1,
                  textTransform: "uppercase", marginBottom: 8, fontFamily: "NotoSans" },
  row:          { flexDirection: "row", alignItems: "center", paddingVertical: 7,
                  borderBottomWidth: 0.5, borderBottomColor: LGRAY },
  position:     { width: 22, fontSize: 9, color: GRAY, fontFamily: "NotoSans", fontWeight: 700 },
  songInfo:     { flex: 1 },
  songTitle:    { fontSize: 11, fontWeight: 700, color: BLACK, fontFamily: "NotoSans" },
  songPinyin:   { fontSize: 8, color: GRAY, fontFamily: "NotoSans", marginTop: 1 },
  songArtist:   { fontSize: 8, color: GRAY, fontFamily: "NotoSans" },
  songNotes:    { fontSize: 8, color: GRAY, fontFamily: "NotoSans", fontStyle: "italic", marginTop: 1 },
  keyChip:      { fontSize: 10, fontWeight: 700, color: BLUE, fontFamily: "NotoSans", minWidth: 28, textAlign: "right" },
  footer:       { position: "absolute", bottom: 20, left: 52, right: 52,
                  flexDirection: "row", justifyContent: "space-between" },
  footerText:   { fontSize: 7, color: GRAY, fontFamily: "NotoSans" },
});

function formatDate(iso: string, language: string): string {
  const locale = language === "zh-CN" ? "zh-CN" : "fr-FR";
  return new Intl.DateTimeFormat(locale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(iso + "T12:00:00"));
}

export function SetlistOverviewPDF({
  setlist,
  songsMap,
  language = "fr",
}: {
  setlist: FSSetlist;
  songsMap: Record<string, SongIndexEntry>;
  language?: string;
}) {
  const sorted = [...setlist.items].sort((a, b) => a.position - b.position);
  const locales: Record<string, any> = language === "zh-CN" ? zhTranslations : frTranslations;
  const songsLabel = locales.common?.header?.songs ?? "Chants";

  return (
    <Document title={setlist.title}>
      <Page size="A4" style={s.page}>
        {/* En-tête */}
        <View style={s.header}>
          <Text style={s.title}>{setlist.title}</Text>
          <Text style={s.subtitle}>{formatDate(setlist.date, language)}</Text>
          <View style={s.metaRow}>
            <Text style={s.metaChip}>{locales.categories?.[setlist.category] ?? setlist.category}</Text>
            {setlist.leader ? <Text style={s.metaChip}>— {setlist.leader}</Text> : null}
            {setlist.notes  ? <Text style={s.metaChip}>{setlist.notes}</Text>  : null}
          </View>
        </View>

        {/* Liste des chants */}
        <Text style={s.sectionLabel}>{songsLabel}</Text>
        {sorted.map((item, idx) => {
          const song = songsMap[item.songSlug];
          const displayKey = item.keyOverride ?? song?.originalKey ?? "?";
          return (
            <View key={`${item.songSlug}-${idx}`} style={s.row}>
              <Text style={s.position}>{item.position}.</Text>
              <View style={s.songInfo}>
                <Text style={s.songTitle}>{song?.title ?? item.songSlug}</Text>
                {song?.titlePinyin ? <Text style={s.songPinyin}>{song.titlePinyin}</Text> : null}
                {song?.artist     ? <Text style={s.songArtist}>{song.artist}</Text>     : null}
                {item.notes       ? <Text style={s.songNotes}>{item.notes}</Text>       : null}
              </View>
              <Text style={s.keyChip}>{displayKey}</Text>
            </View>
          );
        })}

        {/* Pied de page */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>GCC Louange</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
