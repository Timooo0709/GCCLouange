// Parser du bloc {start_of_jianpu} … {end_of_jianpu} des fichiers .cho.
//
// Syntaxe (une ligne musicale = ligne `J:` + ligne(s) de paroles `W:`/`W2:`) :
//   J: 0 [Dmaj9]5_6_ 1_2_ [E]3 (6_5_)0_ | 0 …
//   W: 我知道你爱我
//
//   chiffre 0-7   note (0 = silence)
//   '  ,          point d'octave au-dessus / en dessous (répétables)
//   _  =          croche (1 souligné) / double-croche (2 soulignés)
//   .             note pointée
//   -             prolongation (tenue d'un temps)
//   ( … )         liaison / mélisme (une seule syllabe sur le groupe)
//   |  |]  |: :|  barre de mesure, finale, reprises
//   [C/E]         accord attaché à la note suivante
//   # commentaire de section : [主歌 1] sur sa propre ligne
//
// Les paroles `W:` sont une chaîne de hanzi : chaque note chantée
// (chiffre ≠ 0, hors continuation de liaison, hors tenue) consomme un
// caractère ; la ponctuation （，。！？；、) se colle à la syllabe précédente.

export interface JianpuNote {
  type: "note";
  digit: number;          // 0-7 (0 = silence)
  octave: number;         // +1 / -1 / 0 …
  underlines: number;     // 0 noire, 1 croche, 2 double-croche
  dotted: boolean;
  chord?: string;
  slurStart?: boolean;
  slurEnd?: boolean;
  inSlur?: boolean;       // continuation de liaison (pas de syllabe)
  beamGroup: number;      // notes collées (sans espace) = même groupe
  lyric?: string;
  lyric2?: string;
}

export interface JianpuDash {
  type: "dash";           // prolongation « - »
  chord?: string;
}

export interface JianpuBar {
  type: "bar";
  style: "single" | "final" | "repeat-start" | "repeat-end";
}

export type JianpuSymbol = JianpuNote | JianpuDash | JianpuBar;

export interface JianpuPhrase {
  symbols: JianpuSymbol[];
  hasSecondVoice: boolean;
}

export interface JianpuSection {
  name: string;
  phrases: JianpuPhrase[];
}

export interface JianpuScore {
  key: string;            // « 1=F » → F
  time?: string;          // 4/4
  tempo?: string;         // T=66 → 66
  sections: JianpuSection[];
}

const PUNCT = new Set([..."，。！？；、：…—,.!?;:"]);

function parseMusicLine(src: string, groupOffset: number): { symbols: JianpuSymbol[]; nextGroup: number } {
  const symbols: JianpuSymbol[] = [];
  let chord: string | undefined;
  let slurOpen = false;       // on vient d'ouvrir « ( »
  let slurDepth = 0;
  let group = groupOffset;
  let inToken = false;        // pour découper les beamGroups sur les espaces

  let i = 0;
  while (i < src.length) {
    const c = src[i];

    if (c === " " || c === "\t") {
      if (inToken) { group++; inToken = false; }
      i++;
      continue;
    }
    if (c === "[") {
      const end = src.indexOf("]", i);
      if (end === -1) break;
      chord = src.slice(i + 1, end);
      i = end + 1;
      continue;
    }
    if (c === "(") { slurDepth++; slurOpen = true; i++; continue; }
    if (c === ")") {
      slurDepth = Math.max(0, slurDepth - 1);
      // marquer la dernière note comme fin de liaison
      for (let k = symbols.length - 1; k >= 0; k--) {
        const s = symbols[k];
        if (s.type === "note") { s.slurEnd = true; break; }
      }
      i++;
      continue;
    }
    if (c === "|") {
      if (inToken) { group++; inToken = false; }
      if (src[i + 1] === "]") { symbols.push({ type: "bar", style: "final" }); i += 2; continue; }
      if (src[i + 1] === ":") { symbols.push({ type: "bar", style: "repeat-start" }); i += 2; continue; }
      symbols.push({ type: "bar", style: "single" });
      i++;
      continue;
    }
    if (c === ":" && src[i + 1] === "|") {
      if (inToken) { group++; inToken = false; }
      symbols.push({ type: "bar", style: "repeat-end" });
      i += 2;
      continue;
    }
    if (c === "-") {
      symbols.push({ type: "dash", chord });
      chord = undefined;
      inToken = true;
      i++;
      continue;
    }
    if (c >= "0" && c <= "7") {
      const note: JianpuNote = {
        type: "note",
        digit: Number(c),
        octave: 0,
        underlines: 0,
        dotted: false,
        beamGroup: group,
      };
      i++;
      let reading = true;
      while (reading && i < src.length) {
        const m = src[i];
        if (m === "'") { note.octave++; i++; }
        else if (m === ",") { note.octave--; i++; }
        else if (m === "_") { note.underlines = Math.max(note.underlines, 1); i++; }
        else if (m === "=") { note.underlines = 2; i++; }
        else if (m === ".") { note.dotted = true; i++; }
        else if (m === "*") { note.inSlur = true; i++; }  // note sans syllabe (pickup/écho)
        else reading = false;
      }
      if (chord) { note.chord = chord; chord = undefined; }
      if (slurDepth > 0) {
        if (slurOpen) { note.slurStart = true; slurOpen = false; }
        else note.inSlur = true;
      }
      symbols.push(note);
      inToken = true;
      continue;
    }
    // caractère inconnu — ignorer
    i++;
  }
  return { symbols, nextGroup: group + 1 };
}

/** Une note « chantée » consomme une syllabe. */
function isSung(s: JianpuSymbol): s is JianpuNote {
  return s.type === "note" && s.digit !== 0 && !s.inSlur;
}

function assignLyrics(symbols: JianpuSymbol[], text: string, voice: 1 | 2): void {
  const chars = [...text.replace(/\s+/g, "")];
  let ci = 0;
  for (const s of symbols) {
    if (!isSung(s)) continue;
    if (ci >= chars.length) break;
    let syl = chars[ci++];
    while (ci < chars.length && PUNCT.has(chars[ci])) syl += chars[ci++];
    if (voice === 1) s.lyric = syl;
    else s.lyric2 = syl;
  }
}

export function parseJianpu(raw: string): JianpuScore {
  const score: JianpuScore = { key: "C", sections: [] };
  let section: JianpuSection | null = null;
  let phrase: JianpuPhrase | null = null;
  let group = 0;

  for (const lineRaw of raw.split("\n")) {
    const line = lineRaw.trim();
    if (!line || line.startsWith("#")) continue;

    // En-tête : 1=F 4/4 T=67
    const keyMatch = line.match(/^1=([A-G][#b]?)/);
    if (keyMatch) {
      score.key = keyMatch[1];
      score.time = line.match(/(\d+\/\d+)/)?.[1];
      score.tempo = line.match(/T=?(\d+)/)?.[1];
      continue;
    }

    // Section : [主歌 1]
    const secMatch = line.match(/^\[(.+)\]$/);
    if (secMatch && !line.includes(":")) {
      section = { name: secMatch[1], phrases: [] };
      score.sections.push(section);
      phrase = null;
      continue;
    }

    if (line.startsWith("J:")) {
      if (!section) {
        section = { name: "", phrases: [] };
        score.sections.push(section);
      }
      const parsed = parseMusicLine(line.slice(2), group);
      group = parsed.nextGroup;
      phrase = { symbols: parsed.symbols, hasSecondVoice: false };
      section.phrases.push(phrase);
      continue;
    }
    if (line.startsWith("W2:")) {
      if (phrase) {
        assignLyrics(phrase.symbols, line.slice(3), 2);
        phrase.hasSecondVoice = true;
      }
      continue;
    }
    if (line.startsWith("W:")) {
      if (phrase) assignLyrics(phrase.symbols, line.slice(2), 1);
      continue;
    }
  }
  return score;
}

/**
 * Découpe les symboles d'une partition en mesures (entre barres), en
 * conservant les barres. Utilisé pour la pagination (Mode Louange).
 */
export function countMeasures(score: JianpuScore): number {
  let n = 0;
  for (const sec of score.sections)
    for (const ph of sec.phrases)
      for (const s of ph.symbols)
        if (s.type === "bar") n++;
  return Math.max(1, n);
}
