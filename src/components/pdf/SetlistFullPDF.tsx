import { Document } from "@react-pdf/renderer";
import { SongPDFPage } from "@/components/pdf/SongPDF";
import { transposeAST } from "@/lib/transposeAST";
import { semitonesTo } from "@/lib/transpose";
import type { FSSetlist } from "@/lib/firebase/setlists";
import type { ChordProAST } from "@/types/chordPro";

interface SongContent {
  slug: string;
  ast: ChordProAST;
}

export function SetlistFullPDF({
  setlist,
  contents
}: {
  setlist: FSSetlist;
  contents: Record<string, SongContent>;
}) {
  const sorted = [...setlist.items]
    .sort((a, b) => a.position - b.position)
    .filter((item) => !!contents[item.songSlug]);

  return (
    <Document title={setlist.title}>
      {sorted.map((item, idx) => {
        let ast = contents[item.songSlug].ast;
        if (item.keyOverride && item.keyOverride !== ast.metadata.key) {
          const semitones = semitonesTo(ast.metadata.key, item.keyOverride);
          ast = transposeAST(ast, semitones, item.keyOverride);
        }
        return (
          <SongPDFPage
            key={`${item.songSlug}-${idx}`}
            ast={ast}
            showChords={item.showChords}
            showPinyin={item.showPinyin}
            useJianpu={false}
            structureOverride={item.structureOverride}
            sectionNotes={item.sectionNotes ?? {}}
            footerCenter={setlist.title}
          />
        );
      })}
    </Document>
  );
}
