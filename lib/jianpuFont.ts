/**
 * Converts a jianpu token string to the character sequence
 * used by the 彩虹简谱字库 (Rainbow Jianpu Font) TTF font.
 *
 * Token format (in {jianpu: ...} directives):
 *   [^|_]<degree>[duration][.]
 *
 *   Octave prefix:   ^ = high (dot above), _ = low (dot below), none = middle
 *   Degree:          1-7, 0 = rest
 *   Duration suffix: none = quarter, - = half, -- = whole, e = eighth (unbeamed)
 *   Dot suffix:      . = augmentation dot (dotted rhythm)
 *
 * Examples:
 *   "5"    → "g"      quarter 5
 *   "2."   → "sl"     dotted quarter 2
 *   "^1"   → "ra"     high-octave quarter 1
 *   "_5"   → "zg"     low-octave quarter 5
 *   "3-"   → "d;"     half note 3
 *   "3--"  → "d;;;"   whole note 3
 *   "5e"   → "bgm"    single eighth 5 (unbeamed)
 *   "^5e"  → "brgm"   high-octave single eighth 5
 *
 * Beamed pair (two consecutive eighths): produced externally by toJianpuBeamedPair().
 */

const DEGREE_CHAR: Record<string, string> = {
  '1': 'a', '2': 's', '3': 'd', '4': 'f',
  '5': 'g', '6': 'h', '7': 'j', '0': 'k',
};

export function toJianpuFontStr(token: string): string {
  let rest = token.trim();
  if (!rest) return '';

  // Octave prefix
  let octave = '';
  if (rest.startsWith('^')) { octave = 'r'; rest = rest.slice(1); }
  else if (rest.startsWith('_')) { octave = 'z'; rest = rest.slice(1); }

  // Degree
  const degree = rest[0] ?? '0';
  const nc = DEGREE_CHAR[degree] ?? 'k';
  rest = rest.slice(1);

  // Dotted flag (may appear at end regardless of duration)
  const dotted = rest.endsWith('.');
  if (dotted) rest = rest.slice(0, -1);
  const dot = dotted ? 'l' : '';

  // Duration
  if (rest === '--') return octave + nc + ';;;' + dot; // whole
  if (rest === '-')  return octave + nc + ';' + dot;   // half
  if (rest === 'e')  return 'b' + octave + nc + 'm' + dot; // single eighth

  // Default: quarter
  return octave + nc + dot;
}

/**
 * Produces a beamed pair of two eighth notes (single underline beam).
 * x = beam-left cap, c = beam-connector, v = beam-right cap.
 */
export function toJianpuBeamedPair(tok1: string, tok2: string): string {
  const c1 = singleNoteChar(tok1);
  const c2 = singleNoteChar(tok2);
  return 'x' + c1 + 'c' + c2 + 'v';
}

function singleNoteChar(token: string): string {
  let rest = token.trim();
  let octave = '';
  if (rest.startsWith('^')) { octave = 'r'; rest = rest.slice(1); }
  else if (rest.startsWith('_')) { octave = 'z'; rest = rest.slice(1); }
  const degree = rest[0] ?? '0';
  return octave + (DEGREE_CHAR[degree] ?? 'k');
}

/**
 * Parse a raw jianpu token list (from {jianpu: ...}) and produce
 * an array of { fontStr, isEighth } entries suitable for rendering.
 *
 * Adjacent eighth notes are automatically paired into beamed groups.
 */
export interface JianpuToken {
  raw: string;       // original token string
  fontStr: string;   // characters to render with JianpuFont
}

export function parseJianpuTokens(raw: string): JianpuToken[] {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const result: JianpuToken[] = [];
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];

    // Beam consecutive pairs of eighth notes
    if (isEighthToken(tok) && i + 1 < tokens.length && isEighthToken(tokens[i + 1])) {
      result.push({ raw: tok, fontStr: toJianpuBeamedPair(tok, tokens[i + 1]) });
      result.push({ raw: tokens[i + 1], fontStr: '' }); // consumed by beam
      i += 2;
    } else {
      result.push({ raw: tok, fontStr: toJianpuFontStr(tok) });
      i++;
    }
  }

  return result;
}

function isEighthToken(tok: string): boolean {
  return tok.endsWith('e');
}
