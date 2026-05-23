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
      segments.push({ chord, lyric });
    } else {
      segments.push({ chord: null, lyric: token.value });
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

export function ChordLine({ tokens, showChords = true, fontSize = 0.95 }: ChordLineProps) {
  const segments = toSegments(tokens);
  const hasAnyChord = showChords && segments.some((s) => s.chord !== null);

  return (
    <div
      className="font-mono leading-normal select-text"
      style={{
        fontSize: `${fontSize}rem`,
        paddingTop: hasAnyChord ? "1.5em" : "0.15em",
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
            className="relative inline-block align-bottom"
            style={{ minWidth }}
          >
            {showChords && seg.chord && (
              <span
                className="absolute left-0 whitespace-nowrap font-bold font-chord"
                style={{
                  bottom: "100%",
                  paddingBottom: "2px",
                  fontSize: "0.9em",
                  lineHeight: "1.2",
                }}
              >
                {seg.chord}
              </span>
            )}

            {/* whitespace-pre preserves trailing spaces so words don't merge at chord boundaries */}
            <span 
              className="text-foreground whitespace-pre"
            >
              {(showChords ? seg.lyric : seg.lyric?.trim()) || (seg.chord && showChords ? "  " : "")}
            </span>
          </span>
        );
      })}
    </div>
  );
}
