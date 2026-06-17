import type { SetlistItem } from "@/types/setList";
import type { ChordProSection, ChordProAST } from "@/types/chordPro";
import type { SongContent } from "@/lib/api/songs";
import { transposeAST } from "@/lib/transposeAST";
import { semitonesTo } from "@/lib/transpose";
import { resolveStructureOverride } from "@/lib/chordpro/structure";

export type SongHeaderBlock = {
  kind: "song-header";
  uid: string;
  title: string;
  titlePinyin?: string | null;
  artist: string;
  songKey: string;
  position: number;
  language?: "fr" | "zh";
  /** Fusion en structure mixte : titres + tonalités des chants fusionnés */
  fusionSongs?: { title: string; key: string; language: "fr" | "zh" }[];
};

export type SectionBlock = {
  kind: "section";
  uid: string;
  section: ChordProSection;
  language: "fr" | "zh";
  chordsEnabled: boolean;
  showPinyin: boolean;
  note?: string;
  songTitle: string;
  songKey: string;
  songSourceLabel?: string;
};

export type TransitionIntraBlock = {
  kind: "transition-intra";
  uid: string;
  text: string;
};

export type TransitionInterBlock = {
  kind: "transition-inter";
  uid: string;
  text: string;
};

export type PerformanceBlock =
  | SongHeaderBlock
  | SectionBlock
  | TransitionIntraBlock
  | TransitionInterBlock;

function getTransposed(content: SongContent, keyOverride: string | null): ChordProAST {
  const ast = content.ast;
  if (!keyOverride || keyOverride === ast.metadata.key) return ast;
  return transposeAST(ast, semitonesTo(ast.metadata.key, keyOverride), keyOverride);
}

function resolveSections(ast: ChordProAST, structureOverride: string[] | null): ChordProSection[] {
  if (!structureOverride?.length) return ast.sections;
  return resolveStructureOverride(ast.sections, structureOverride);
}

export function buildPerformanceBlocks(
  items: SetlistItem[],
  contents: Record<string, SongContent>,
  showChordsGlobal: boolean,
): PerformanceBlock[] {
  const blocks: PerformanceBlock[] = [];
  let c = 0;
  const uid = () => `pb-${c++}`;

  for (const item of [...items].sort((a, b) => a.position - b.position)) {
    // ── Transition inter-chant ──
    if (item.type === "transition") {
      if (item.transitionText) blocks.push({ kind: "transition-inter", uid: uid(), text: item.transitionText });
      continue;
    }

    // ── Fusion ──
    if (item.type === "fusion" && item.fusionSongs) {
      const asts: Record<string, ChordProAST> = {};
      for (const fs of item.fusionSongs) {
        const content = contents[fs.songSlug];
        if (content) asts[fs.songSlug] = getTransposed(content, fs.keyOverride);
      }

      if (item.mixedStructure?.length) {
        const multiSong = item.fusionSongs.length > 1;
        const fusionMeta = item.fusionSongs.flatMap((fs) => {
          const ast = asts[fs.songSlug];
          return ast
            ? [{
                title: ast.metadata.title,
                key: fs.keyOverride ?? ast.metadata.key,
                language: ast.metadata.language,
              }]
            : [];
        });
        if (fusionMeta.length > 0) {
          blocks.push({
            kind: "song-header",
            uid: uid(),
            title: fusionMeta.map((m) => m.title).join(" + "),
            artist: "",
            songKey: fusionMeta.map((m) => m.key).join(" / "),
            position: item.position,
            fusionSongs: fusionMeta,
          });
        }
        for (const ms of item.mixedStructure) {
          const ast = asts[ms.songSlug];
          if (!ast) continue;
          const section = ast.sections.find((s) => s.uid === ms.sectionId || s.id === ms.sectionId);
          if (!section) continue;
          const fs = item.fusionSongs.find((f) => f.songSlug === ms.songSlug);
          blocks.push({
            kind: "section",
            uid: uid(),
            section,
            language: ast.metadata.language,
            chordsEnabled: showChordsGlobal && item.showChords,
            showPinyin: ast.metadata.language === "zh",
            note: ms.note ?? fs?.sectionNotes?.[ms.sectionId],
            songTitle: ast.metadata.title,
            songKey: fs?.keyOverride ?? ast.metadata.key,
            songSourceLabel: multiSong ? ast.metadata.title : undefined,
          });
          if (ms.transition) blocks.push({ kind: "transition-intra", uid: uid(), text: ms.transition });
        }
      } else {
        for (let i = 0; i < item.fusionSongs.length; i++) {
          const fs = item.fusionSongs[i];
          const ast = asts[fs.songSlug];
          if (!ast) continue;
          if (i > 0) blocks.push({ kind: "transition-inter", uid: uid(), text: "" });
          blocks.push({
            kind: "song-header",
            uid: uid(),
            title: ast.metadata.title,
            titlePinyin: ast.metadata.titlePinyin,
            artist: ast.metadata.artist,
            songKey: fs.keyOverride ?? ast.metadata.key,
            position: item.position,
            language: ast.metadata.language,
          });
          for (const sec of resolveSections(ast, fs.structureOverride)) {
            blocks.push({
              kind: "section",
              uid: uid(),
              section: sec,
              language: ast.metadata.language,
              chordsEnabled: showChordsGlobal && item.showChords,
              showPinyin: ast.metadata.language === "zh",
              note: fs.sectionNotes?.[sec.uid] ?? fs.sectionNotes?.[sec.id],
              songTitle: ast.metadata.title,
              songKey: fs.keyOverride ?? ast.metadata.key,
            });
          }
        }
      }
      continue;
    }

    // ── Chant normal ──
    const content = contents[item.songSlug];
    if (!content) continue;
    const ast = getTransposed(content, item.keyOverride);
    const sections = resolveSections(ast, item.structureOverride);
    blocks.push({
      kind: "song-header",
      uid: uid(),
      title: ast.metadata.title,
      titlePinyin: ast.metadata.titlePinyin,
      artist: ast.metadata.artist,
      songKey: item.keyOverride ?? ast.metadata.key,
      position: item.position,
      language: ast.metadata.language,
    });
    const occ: Record<string, number> = {};

    for (const sec of sections) {
      const i = occ[sec.id] ?? 0;
      occ[sec.id] = i + 1;
      const occKey = i === 0 ? sec.id : `${sec.id}:${i}`;
      const note =
        item.sectionNotes?.[sec.uid] ?? item.sectionNotes?.[occKey] ?? item.sectionNotes?.[sec.id] ?? "";
      const transition =
        item.sectionTransitions?.[sec.uid] ??
        item.sectionTransitions?.[occKey] ??
        item.sectionTransitions?.[sec.id] ??
        "";
      blocks.push({
        kind: "section",
        uid: uid(),
        section: sec,
        language: ast.metadata.language,
        chordsEnabled: showChordsGlobal && item.showChords,
        showPinyin: item.showPinyin,
        note: note || undefined,
        songTitle: ast.metadata.title,
        songKey: item.keyOverride ?? ast.metadata.key,
      });
      if (transition) blocks.push({ kind: "transition-intra", uid: uid(), text: transition });
    }
  }

  return blocks;
}

export function computePageKey(
  blocks: PerformanceBlock[],
  indices: number[],
  layoutSig = "",
): string {
  const uids = indices
    .map((i) => blocks[i])
    .filter((b): b is SectionBlock => b.kind === "section")
    .map((b) => b.section.uid);
  let h = 0;
  // Repli sur les indices quand la page n'a aucune section (page 100 % transitions) :
  // évite que toutes ces pages partagent la clé "0" (annotations mélangées).
  const str = uids.length ? uids.join(",") : `idx:${indices.join(",")}`;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  const base = (h >>> 0).toString(36);
  return layoutSig ? `${base}-${layoutSig}` : base;
}
