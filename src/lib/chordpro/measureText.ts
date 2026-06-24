// Mesure des largeurs de texte pour le rendu PDF (react-pdf génère le PDF côté
// navigateur → on ne peut pas mesurer les polices au runtime de façon fiable).
// On somme les avances de glyphes pré-calculées (scripts/build-glyph-widths.ts).
// Remplace l'ancienne approximation « nbChars × constante », fausse pour une
// police proportionnelle.
import glyphWidths from "./glyphWidths.json";

const LYRIC = glyphWidths.lyric as Record<string, number>;
const CHORD = glyphWidths.chord as Record<string, number>;
const CJK = glyphWidths.cjkAdvance;

const avg = (m: Record<string, number>) => {
  const v = Object.values(m);
  return v.reduce((a, b) => a + b, 0) / v.length;
};
const LYRIC_AVG = avg(LYRIC);
const CHORD_AVG = avg(CHORD);

function isCJKish(cp: number): boolean {
  return (
    (cp >= 0x3000 && cp <= 0x9fff) || // ponctuation CJK + idéogrammes
    (cp >= 0x3400 && cp <= 0x4dbf) || // extension A
    (cp >= 0xff00 && cp <= 0xffef)    // formes pleine chasse
  );
}

/** Largeur (pt) d'une chaîne dans la police paroles (Inter) à `sizePt`. */
export function measureLyric(str: string, sizePt: number): number {
  let em = 0;
  for (const ch of str) {
    const cp = ch.codePointAt(0) ?? 0;
    em += isCJKish(cp) ? CJK : LYRIC[ch] ?? LYRIC_AVG;
  }
  return em * sizePt;
}

/** Largeur (pt) d'une chaîne dans la police accords (LiberationSans-Bold) à `sizePt`. */
export function measureChord(str: string, sizePt: number): number {
  let em = 0;
  for (const ch of str) em += CHORD[ch] ?? CHORD_AVG;
  return em * sizePt;
}
