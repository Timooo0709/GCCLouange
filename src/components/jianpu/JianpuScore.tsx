"use client";

// Rendu SVG d'une partition 简谱 (jianpu) complète : accords, chiffres,
// points d'octave, soulignés (croches/doubles), notes pointées, tenues,
// silences, barres de mesure, liaisons, paroles hanzi et pinyin.
//
// La transposition ne change JAMAIS les chiffres : seuls « 1=X » et les
// accords sont transposés.

import { useMemo } from "react";
import { pinyin } from "pinyin-pro";
import { transposeChord } from "@/lib/transpose";
import { chordFont, zhLyricFont } from "@/components/song/SongView";
import {
  parseJianpu,
  type JianpuScore as Score,
  type JianpuSymbol,
  type JianpuSection,
} from "@/lib/jianpu/parseJianpu";

// ─── Layout constants (unités SVG) ────────────────────────────────────────────
const NOTE_W = 30;          // largeur d'une colonne note/tenue
const BAR_W = 16;           // largeur d'une barre de mesure
const ROW_CHORD = 16;       // baseline accords
const ROW_OCT_UP = 30;      // points d'octave supérieurs
const ROW_DIGIT = 52;       // baseline chiffres
const ROW_UNDER = 58;       // 1er souligné
const ROW_LYric = 86;       // baseline paroles
const ROW_PINYIN = 106;     // baseline pinyin
const ROW_LYRIC2 = 126;     // 2e voix (couplet 2)
const PHRASE_GAP = 18;      // espace entre phrases
const SECTION_GAP = 26;     // espace avant un titre de section
const SECTION_H = 22;       // hauteur du titre de section

interface FlatItem {
  sym: JianpuSymbol;
  x: number;
}

/** Largeur d'un symbole. */
function symWidth(s: JianpuSymbol): number {
  return s.type === "bar" ? BAR_W : NOTE_W;
}

/**
 * Découpe une phrase en lignes de rendu : au plus `maxMeasures` mesures par
 * ligne (mise en page régulière, type partition papier), et jamais plus
 * large que maxWidth. On coupe AVANT d'ajouter la mesure qui dépasserait —
 * jamais après, sinon la ligne déborde du viewBox et se fait rogner.
 */
function wrapPhrase(symbols: JianpuSymbol[], maxWidth: number, maxMeasures = 2): JianpuSymbol[][] {
  const lines: JianpuSymbol[][] = [];
  let current: JianpuSymbol[] = [];
  let width = 0;
  let measuresInLine = 0;
  let measure: JianpuSymbol[] = [];   // mesure en cours (pour couper aux barres)
  let measureW = 0;

  const flushLine = () => {
    if (current.length > 0) lines.push(current);
    current = [];
    width = 0;
    measuresInLine = 0;
  };
  const commitMeasure = () => {
    if (measure.length === 0) return;
    if (current.length > 0 && (width + measureW > maxWidth || measuresInLine >= maxMeasures)) {
      flushLine();
    }
    current.push(...measure);
    width += measureW;
    measuresInLine++;
    measure = [];
    measureW = 0;
  };

  for (const s of symbols) {
    measure.push(s);
    measureW += symWidth(s);
    if (s.type === "bar") commitMeasure();
  }
  commitMeasure();
  flushLine();
  return lines.filter((l) => l.some((s) => s.type !== "bar"));
}

function phraseHeight(hasSecondVoice: boolean, showPinyin: boolean): number {
  if (hasSecondVoice) return (showPinyin ? ROW_LYRIC2 : ROW_PINYIN) + 8;
  return (showPinyin ? ROW_PINYIN : ROW_LYric) + 10;
}

// ─── Rendu d'une ligne de symboles ────────────────────────────────────────────

function LineSvg({
  items,
  y0,
  hasSecondVoice,
  showPinyin,
  showChords,
  semitones,
  targetKey,
}: {
  items: FlatItem[];
  y0: number;
  hasSecondVoice: boolean;
  showPinyin: boolean;
  showChords: boolean;
  semitones: number;
  targetKey: string;
}) {
  const els: React.ReactNode[] = [];
  // Anti-chevauchement des labels d'accords (positions séquentielles gauche → droite)
  let lastChordEnd = -Infinity;
  const pushChord = (key: string, desiredX: number, y: number, chord: string) => {
    const label = transposeChord(chord, semitones, targetKey);
    const x = Math.max(desiredX, lastChordEnd);
    lastChordEnd = x + label.length * 8 + 8;
    els.push(
      <text key={key} x={x} y={y} className={`jp-chord ${chordFont.className}`}>
        {label}
      </text>,
    );
  };

  // Soulignés : runs de notes adjacentes du même beamGroup et de niveau ≥ n
  for (let level = 1; level <= 2; level++) {
    let runStart: number | null = null;
    let runEnd = 0;
    let runGroup = -1;
    const flushRun = () => {
      if (runStart !== null) {
        els.push(
          <line
            key={`u${level}-${runStart}-${runEnd}`}
            x1={runStart} x2={runEnd}
            y1={y0 + ROW_UNDER + (level - 1) * 5}
            y2={y0 + ROW_UNDER + (level - 1) * 5}
            stroke="currentColor" strokeWidth={1.4}
          />,
        );
      }
      runStart = null;
    };
    for (const it of items) {
      const s = it.sym;
      if (s.type === "note" && s.underlines >= level) {
        const x1 = it.x + 5;
        const x2 = it.x + NOTE_W - 9;
        if (runStart !== null && s.beamGroup === runGroup) {
          runEnd = x2;
        } else {
          flushRun();
          runStart = x1;
          runEnd = x2;
          runGroup = s.beamGroup;
        }
      } else {
        flushRun();
      }
    }
    flushRun();
  }

  // Liaisons : arc du slurStart au slurEnd
  let slurFrom: number | null = null;
  for (const it of items) {
    const s = it.sym;
    if (s.type !== "note") continue;
    if (s.slurStart) slurFrom = it.x + 8;
    if (s.slurEnd && slurFrom !== null) {
      const x2 = it.x + 14;
      const mid = (slurFrom + x2) / 2;
      els.push(
        <path
          key={`slur-${slurFrom}-${x2}`}
          d={`M ${slurFrom} ${y0 + ROW_OCT_UP + 2} Q ${mid} ${y0 + ROW_OCT_UP - 10} ${x2} ${y0 + ROW_OCT_UP + 2}`}
          fill="none" stroke="currentColor" strokeWidth={1.2}
        />,
      );
      slurFrom = null;
    }
  }

  for (const it of items) {
    const s = it.sym;
    const cx = it.x + (s.type === "bar" ? BAR_W / 2 : 10);

    if (s.type === "bar") {
      const x = it.x + BAR_W / 2;
      if (s.style === "final") {
        els.push(<line key={`b${it.x}`} x1={x - 3} x2={x - 3} y1={y0 + 34} y2={y0 + ROW_DIGIT + 4} stroke="currentColor" strokeWidth={1} />);
        els.push(<line key={`b2${it.x}`} x1={x + 1} x2={x + 1} y1={y0 + 34} y2={y0 + ROW_DIGIT + 4} stroke="currentColor" strokeWidth={3} />);
      } else if (s.style === "repeat-start" || s.style === "repeat-end") {
        const thick = s.style === "repeat-start" ? x - 3 : x + 3;
        const dots = s.style === "repeat-start" ? x + 5 : x - 5;
        els.push(<line key={`b${it.x}`} x1={thick} x2={thick} y1={y0 + 34} y2={y0 + ROW_DIGIT + 4} stroke="currentColor" strokeWidth={3} />);
        els.push(<circle key={`d1${it.x}`} cx={dots} cy={y0 + 41} r={1.6} fill="currentColor" />);
        els.push(<circle key={`d2${it.x}`} cx={dots} cy={y0 + 49} r={1.6} fill="currentColor" />);
      } else {
        els.push(<line key={`b${it.x}`} x1={x} x2={x} y1={y0 + 34} y2={y0 + ROW_DIGIT + 4} stroke="currentColor" strokeWidth={1.2} />);
      }
      continue;
    }

    if (s.type === "dash") {
      if (showChords && s.chord) {
        pushChord(`c${it.x}`, cx - 4, y0 + ROW_CHORD, s.chord);
      }
      els.push(
        <line key={`t${it.x}`} x1={it.x + 3} x2={it.x + NOTE_W - 11} y1={y0 + ROW_DIGIT - 5} y2={y0 + ROW_DIGIT - 5} stroke="currentColor" strokeWidth={1.6} />,
      );
      continue;
    }

    // note
    if (showChords && s.chord) {
      pushChord(`c${it.x}`, cx - 6, y0 + ROW_CHORD, s.chord);
    }
    els.push(
      <text key={`n${it.x}`} x={cx} y={y0 + ROW_DIGIT} textAnchor="middle" className="jp-digit">
        {s.digit}
      </text>,
    );
    if (s.dotted) {
      els.push(<circle key={`pt${it.x}`} cx={cx + 9} cy={y0 + ROW_DIGIT - 5} r={1.8} fill="currentColor" />);
    }
    for (let o = 0; o < s.octave; o++) {
      els.push(<circle key={`o${it.x}-${o}`} cx={cx} cy={y0 + ROW_OCT_UP - o * 6 + 6} r={1.8} fill="currentColor" />);
    }
    for (let o = 0; o < -s.octave; o++) {
      els.push(
        <circle
          key={`ob${it.x}-${o}`}
          cx={cx}
          cy={y0 + ROW_UNDER + (s.underlines > 0 ? s.underlines * 5 : 0) + 4 + o * 6}
          r={1.8} fill="currentColor"
        />,
      );
    }
    if (s.lyric) {
      els.push(
        <text key={`l${it.x}`} x={cx} y={y0 + ROW_LYric} textAnchor="middle" className={`jp-lyric ${zhLyricFont.className}`}>
          {s.lyric}
        </text>,
      );
      if (showPinyin) {
        const py = pinyin(s.lyric[0], { toneType: "symbol", type: "string" });
        els.push(
          <text key={`p${it.x}`} x={cx} y={y0 + ROW_PINYIN} textAnchor="middle" className={`jp-pinyin ${zhLyricFont.className}`}>
            {py}
          </text>,
        );
      }
    }
    if (hasSecondVoice && s.lyric2) {
      els.push(
        <text key={`l2${it.x}`} x={cx} y={y0 + (showPinyin ? ROW_LYRIC2 : ROW_PINYIN)} textAnchor="middle" className={`jp-lyric jp-lyric2 ${zhLyricFont.className}`}>
          {s.lyric2}
        </text>,
      );
    }
  }

  return <>{els}</>;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export interface JianpuScoreProps {
  raw: string;
  /** Tonalité affichée (1=X) ; les accords sont transposés vers elle. */
  targetKey?: string;
  semitones?: number;
  showChords?: boolean;
  showPinyin?: boolean;
  /** Largeur maximale d'une ligne en unités SVG (défaut 760). */
  maxWidth?: number;
  /** Nombre maximal de mesures par ligne (défaut 2). */
  measuresPerLine?: number;
  /** Ne rendre que les sections [from, to) — pour la pagination Mode Louange. */
  sectionRange?: [number, number];
  /** Masquer l'en-tête 1=X / métrique / tempo. */
  hideHeader?: boolean;
  title?: string;
}

export function JianpuScore({
  raw,
  targetKey,
  semitones = 0,
  showChords = true,
  showPinyin = true,
  maxWidth = 760,
  measuresPerLine = 2,
  sectionRange,
  hideHeader = false,
  title,
}: JianpuScoreProps) {
  const score: Score = useMemo(() => parseJianpu(raw), [raw]);
  const displayKey = targetKey ?? score.key;

  const sections: JianpuSection[] = sectionRange
    ? score.sections.slice(sectionRange[0], sectionRange[1])
    : score.sections;

  // Layout : positionner chaque phrase (wrap par mesures)
  const layout = useMemo(() => {
    const blocks: {
      items: FlatItem[];
      y: number;
      hasSecondVoice: boolean;
      sectionTitle?: string;
    }[] = [];
    let y = hideHeader ? 6 : 30;

    for (const sec of sections) {
      let firstOfSection = true;
      for (const ph of sec.phrases) {
        for (const lineSyms of wrapPhrase(ph.symbols, maxWidth, measuresPerLine)) {
          let x = 0;
          const items: FlatItem[] = lineSyms.map((sym) => {
            const it = { sym, x };
            x += symWidth(sym);
            return it;
          });
          if (firstOfSection && sec.name) {
            y += SECTION_GAP;
            blocks.push({ items, y: y + SECTION_H, hasSecondVoice: ph.hasSecondVoice, sectionTitle: sec.name });
            y += SECTION_H;
          } else {
            blocks.push({ items, y, hasSecondVoice: ph.hasSecondVoice });
          }
          firstOfSection = false;
          y += phraseHeight(ph.hasSecondVoice, showPinyin) + PHRASE_GAP;
        }
      }
    }
    return { blocks, totalH: y + 10 };
  }, [sections, maxWidth, measuresPerLine, showPinyin, hideHeader]);

  return (
    <div className="jianpu-score max-w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${maxWidth} ${layout.totalH}`}
        width="100%"
        style={{ maxWidth: `${maxWidth}px`, display: "block" }}
        className="text-foreground"
      >
        <style>{`
          .jp-chord  { font-size: 13.5px; font-weight: 700; fill: var(--chord-color, #2563eb); }
          .jp-digit  { font: 500 19px ui-monospace, monospace; fill: currentColor; }
          .jp-lyric  { font-size: 15px; fill: currentColor; }
          .jp-lyric2 { fill: var(--muted-foreground, #6b7079); }
          .jp-pinyin { font-size: 9.5px; fill: var(--muted-foreground, #6b7079); }
          .jp-head   { font: 600 13px sans-serif; fill: currentColor; }
          .jp-sec    { font: 700 12px sans-serif; fill: var(--section-color, #ea580c); letter-spacing: 0.1em; }
        `}</style>

        {!hideHeader && (
          <text x={0} y={16} className="jp-head">
            1={displayKey}
            {score.time ? `  ${score.time}` : ""}
            {score.tempo ? `  ♩=${score.tempo}` : ""}
            {title ? `   ${title}` : ""}
          </text>
        )}

        {layout.blocks.map((b, i) => (
          <g key={i}>
            {b.sectionTitle && (
              <text x={0} y={b.y - SECTION_H + 8} className="jp-sec">
                {b.sectionTitle}
              </text>
            )}
            <LineSvg
              items={b.items}
              y0={b.y}
              hasSecondVoice={b.hasSecondVoice}
              showPinyin={showPinyin}
              showChords={showChords}
              semitones={semitones}
              targetKey={displayKey}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
