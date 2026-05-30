"use client";

import type { Token } from "@/lib/types";

type Segment = { chord: string | null; lyric: string };

function toSegments(tokens: Token[]): Segment[] {
  const segments: Segment[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === "chord") {
      const chord = token.value;
      let lyric = "";
      i++;
      while (i < tokens.length && tokens[i].type === "lyric") {
        lyric += tokens[i].value;
        i++;
      }

      // Sépare le premier mot (collé à l'accord) du reste
      const spaceIdx = lyric.search(/\s/);
      if (spaceIdx === -1 || spaceIdx === lyric.length - 1) {
        // Pas d'espace ou espace seulement à la fin → un seul segment
        segments.push({ chord, lyric });
      } else {
        // Premier mot avec l'accord, puis le reste mot par mot
        const firstWord = lyric.slice(0, spaceIdx + 1); // inclut l'espace trailing
        const rest = lyric.slice(spaceIdx + 1);
        segments.push({ chord, lyric: firstWord });
        // Découpe le reste mot par mot
        const words = rest.split(/(?<=\s)/);
        for (const word of words) {
          if (word) segments.push({ chord: null, lyric: word });
        }
      }
    } else {
      // Lyric sans accord → mot par mot
      const words = token.value.split(/(?<=\s)/);
      for (const word of words) {
        if (word) segments.push({ chord: null, lyric: word });
      }
      i++;
    }
  }

  return segments;
}

interface ChordLineProps {
  tokens: Token[];
  showChords?: boolean;
  fontSize?: number;
}

export function ChordLine({ tokens, showChords = true, fontSize = 0.88 }: ChordLineProps) {
  const segments = toSegments(tokens);
  const hasAnyChord = showChords && segments.some((s) => s.chord !== null);
  return (
    <div
      className="font-sans leading-normal select-text flex flex-wrap items-end"
      style={{
        fontSize: `${fontSize}rem`,
        paddingTop: "0.15em", // plus besoin du 1.5em
        paddingBottom: "0.15em",
        lineHeight: segments.every(s => !s.lyric?.trim()) ? "0" : undefined,
      }}
    >
      {segments.map((seg, i) => {
        const chordLen = seg.chord?.length ?? 0;
        const lyricLen = [...(seg.lyric)].length;
        const minWidth =
          hasAnyChord && chordLen > lyricLen
            ? `${chordLen + 0.5}ch`
            : undefined;
        return (
          <span
            key={i}
            className="inline-flex flex-col align-bottom whitespace-nowrap"
            style={{ minWidth }}
          >
            {showChords && seg.chord ? (
              <span className="font-bold font-chord whitespace-nowrap text-[0.9em] leading-[0.7] pb-[-2px]">
                {seg.chord}
              </span>
            ) : (
              hasAnyChord && <span className="leading-[0.7] pb-[-2px] text-[0.9em]">&nbsp;</span>
            )}
            <span className="text-foreground whitespace-pre">
              {(showChords ? seg.lyric : seg.lyric?.trimStart()) || (seg.chord && showChords ? " " : "")}
            </span>
          </span>
        );
      })}
    </div>
  );
}
