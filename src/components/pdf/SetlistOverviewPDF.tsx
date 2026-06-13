import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";
import type { FSSetlist } from "@/lib/firebase/setlists";
import type { SongIndexEntry } from "@/types/song";
import { formatDate } from "@/lib/utils/formatDate";
import frTranslations from "@/locales/fr.json";
import zhTranslations from "@/locales/zh-CN.json";

Font.register({
  family: "SpaceGrotesk",
  fonts: [
    { src: "/fonts/SpaceGrotesk-Light.ttf", fontWeight: 300 },
    { src: "/fonts/SpaceGrotesk-Bold.ttf",  fontWeight: 700 },
  ],
});
Font.register({
  family: "Inter",
  fonts: [{ src: "/fonts/inter-latin-ext-400-normal.ttf", fontWeight: 400 }],
});
Font.register({
  family: "LiberationSans",
  fonts: [
    { src: "/fonts/LiberationSans-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/LiberationSans-Bold.ttf",    fontWeight: 700 },
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

const ORANGE = "#EA580C";
const BLUE   = "#2563EB";
const GRAY   = "#6b7280";
const LGRAY  = "#d1d5db";
const BLACK  = "#111827";

const s = StyleSheet.create({
  page:         { paddingTop: 44, paddingBottom: 50, paddingHorizontal: 52, backgroundColor: "#fff", fontFamily: "Inter" },
  header:       { marginBottom: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: LGRAY },
  row:          { flexDirection: "row", alignItems: "center", paddingVertical: 7,
                  borderBottomWidth: 0.5, borderBottomColor: LGRAY },
  songInfo:     { flex: 1 },
  footer:       { position: "absolute", bottom: 20, left: 52, right: 52,
                  flexDirection: "row", justifyContent: "space-between" },
  footerText:   { fontSize: 7, color: GRAY, fontFamily: "LiberationSans" },
});

export function SetlistOverviewPDF({
  setlist,
  songsMap,
  language = "fr",
}: {
  setlist: FSSetlist;
  songsMap: Record<string, SongIndexEntry>;
  language?: string;
}) {
  const isUiZh = language === "zh-CN";
  const sorted = [...setlist.items].sort((a, b) => a.position - b.position);
  const locales = (isUiZh ? zhTranslations : frTranslations) as {
    common?: { header?: { songs?: string } };
    categories?: Record<string, string>;
  };
  const songsLabel = locales.common?.header?.songs ?? "Chants";
  const labelFont = isUiZh ? "SourceHanSansCN" : "SpaceGrotesk";

  return (
    <Document title={setlist.title}>
      <Page size="A4" style={s.page}>
        {/* En-tête */}
        <View style={s.header}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: BLACK, marginBottom: 3,
                         fontFamily: "SpaceGrotesk" }}>
            {setlist.title}
          </Text>
          <Text style={{ fontSize: 10, color: GRAY, fontFamily: labelFont, fontWeight: 300, marginBottom: 2 }}>
            {formatDate(setlist.date, language)}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
            <Text style={{ fontSize: 9, color: GRAY, fontFamily: labelFont, fontWeight: 300 }}>
              {locales.categories?.[setlist.category] ?? setlist.category}
            </Text>
            {setlist.leader ? (
              <Text style={{ fontSize: 9, color: GRAY, fontFamily: labelFont, fontWeight: 300 }}>— {setlist.leader}</Text>
            ) : null}
            {setlist.notes ? (
              <Text style={{ fontSize: 9, color: GRAY, fontFamily: labelFont, fontWeight: 300 }}>{setlist.notes}</Text>
            ) : null}
          </View>
        </View>

        {/* Liste des chants */}
        <Text style={{ fontSize: 8, fontWeight: 700, color: ORANGE, letterSpacing: 1,
                       textTransform: "uppercase", marginBottom: 8, fontFamily: "SpaceGrotesk" }}>
          {songsLabel}
        </Text>
        {sorted.map((item, idx) => {
          const song = songsMap[item.songSlug];
          const isSongZh = song?.language === "zh";
          const displayKey = item.keyOverride ?? song?.originalKey ?? "?";
          const titleFont = isSongZh ? "KaiTi" : "SpaceGrotesk";
          const artistFont = isSongZh ? "SourceHanSansCN" : "SpaceGrotesk";
          return (
            <View key={`${item.songSlug}-${idx}`} style={s.row}>
              <Text style={{ width: 22, fontSize: 9, color: GRAY, fontFamily: "SpaceGrotesk", fontWeight: 300 }}>
                {item.position}.
              </Text>
              <View style={s.songInfo}>
                <Text style={{ fontSize: 11, fontWeight: 700, color: BLACK, fontFamily: titleFont }}>
                  {song?.title ?? item.songSlug}
                </Text>
                {song?.titlePinyin ? (
                  <Text style={{ fontSize: 8, color: GRAY, fontFamily: "SourceHanSansCN", fontWeight: 300, marginTop: 1 }}>
                    {song.titlePinyin}
                  </Text>
                ) : null}
                {song?.artist ? (
                  <Text style={{ fontSize: 8, color: GRAY, fontFamily: artistFont, fontWeight: 300 }}>
                    {song.artist}
                  </Text>
                ) : null}
                {item.notes ? (
                  <Text style={{ fontSize: 8, color: GRAY, fontFamily: "Inter", fontStyle: "italic", marginTop: 1 }}>
                    {item.notes}
                  </Text>
                ) : null}
              </View>
              <Text style={{ fontSize: 10, fontWeight: 700, color: BLUE, fontFamily: "SpaceGrotesk",
                             minWidth: 28, textAlign: "right" }}>
                {displayKey}
              </Text>
            </View>
          );
        })}

        {/* Pied de page */}
        <View style={s.footer} fixed>
          <Text style={[s.footerText, { fontWeight: 700, color: ORANGE, letterSpacing: 1 }]}>GCC LOUANGE</Text>
          <Text style={[s.footerText, { fontWeight: 400 }]}>{setlist.title}</Text>
          <Text
            style={[s.footerText, { fontWeight: 400 }]}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
