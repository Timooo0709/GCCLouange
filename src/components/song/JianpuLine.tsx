"use client";

import type { ChordProLine, Token } from "@/types/chordPro";

function isCJK(char: string): boolean {
  const cp = char.codePointAt(0) ?? 0;
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x20000 && cp <= 0x2a6df)
  );
}

function lyricsFromTokens(tokens: Token[]): string {
  return tokens
    .filter((t) => t.type === "lyric")
    .map((t) => t.value)
    .join("");
}

// Track total char count (all chars including punctuation) for visual column positioning.
function chordsFromTokens(tokens: Token[]): { chord: string; afterAllChars: number }[] {
  const result: { chord: string; afterAllChars: number }[] = [];
  let charCount = 0;
  for (const token of tokens) {
    if (token.type === "lyric") {
      charCount += [...token.value].length;
    } else if (token.type === "chord") {
      result.push({ chord: token.value, afterAllChars: charCount });
    }
  }
  return result;
}

interface JianpuLineProps {
  line: ChordProLine;
  showChords?: boolean;
  showPinyin?: boolean;
}

export function JianpuLine({ line, showChords = true, showPinyin = true }: JianpuLineProps) {
  const lyrics = lyricsFromTokens(line.tokens);
  const chords = chordsFromTokens(line.tokens);
  const jianpuNumbers = line.jianpu?.split(/\s+/).filter(Boolean) ?? [];
  const pinyinSyllables = line.pinyin?.split(/\s+/).filter(Boolean) ?? [];
  const cellSize = "1.8rem";

  // Map jianpu/pinyin indices to CJK chars only; punctuation gets empty slots.
  let cjkIdx = 0;
  const columns = [...lyrics].map((char) => {
    if (isCJK(char)) {
      const entry = {
        char,
        jianpu: jianpuNumbers[cjkIdx] ?? "",
        pinyin: pinyinSyllables[cjkIdx] ?? "",
      };
      cjkIdx++;
      return entry;
    }
    return { char, jianpu: "", pinyin: "" };
  });

  return (
    <div className="font-mono my-1 select-text">
      {/* Chord row: each chord absolutely positioned over its column */}
      {showChords && chords.length > 0 && (
        <div className="relative" style={{ height: "1.5em" }}>
          {chords.map((c, i) => (
            <span
              key={i}
              className="absolute bottom-0 font-bold font-chord text-chord dark:text-blue-400 text-sm whitespace-nowrap"
              style={{ left: `calc(${c.afterAllChars} * ${cellSize})` }}
            >
              {c.chord}
            </span>
          ))}
        </div>
      )}

      {/* Columns: jianpu number / Chinese char / pinyin */}
      <div className="flex flex-wrap items-end gap-0">
        {columns.map((col, i) => (
          <div
            key={i}
            className="flex flex-col items-center"
            style={{ width: cellSize, minWidth: cellSize }}
          >
            <span
              className="text-red-700 dark:text-red-400 font-bold text-sm leading-snug"
              style={{ minHeight: "1.2em" }}
            >
              {col.jianpu}
            </span>
            <span className="text-foreground leading-snug" style={{ fontSize: "1rem" }}>
              {col.char}
            </span>
            {showPinyin && (
              <span className="text-muted-foreground leading-snug" style={{ fontSize: "0.65rem" }}>
                {col.pinyin}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
