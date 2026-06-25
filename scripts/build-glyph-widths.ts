// Génère src/lib/chordpro/glyphWidths.json : l'avance (en em, 1em = fontSize) de
// chaque glyphe pour les polices du PDF. Permet de MESURER les largeurs réelles
// côté navigateur (lookup) au lieu de les deviner caractère × constante.
//
// À relancer si on change Inter-Regular / LiberationSans-Bold / SourceHanSansCN.
// Branché dans `npm run build:index`.
import * as fs from "fs";
import * as path from "path";
// @ts-expect-error fontkit ne fournit pas de déclarations de types
import fontkit from "fontkit";

const FONTS = path.join(process.cwd(), "public", "fonts");
const OUT = path.join(process.cwd(), "src", "lib", "chordpro", "glyphWidths.json");

// Jeux de caractères à mesurer (paroles FR, accords, pinyin).
const ASCII = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
const FRENCH = "àâäáãéèêëíìîïóòôöõúùûüÿçñœæÀÂÄÉÈÊËÎÏÔÖÛÜÇŒÆ«»…’‘“”–—°€";
const PINYIN = "āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀ";
const CHARSET = ASCII + FRENCH + PINYIN;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function advances(file: string, chars: string): Record<string, number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const font: any = fontkit.openSync(path.join(FONTS, file));
  const upm: number = font.unitsPerEm;
  const out: Record<string, number> = {};
  for (const ch of chars) {
    const run = font.layout(ch);
    out[ch] = run.advanceWidth / upm;
  }
  return out;
}

function cjkAdvance(file: string): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const font: any = fontkit.openSync(path.join(FONTS, file));
  return font.layout("永").advanceWidth / font.unitsPerEm;
}

const table = {
  _note: "advance en em (1em = fontSize). lyric=Inter-Regular, chord=SpaceGrotesk-Bold (= police accords web).",
  lyric: advances("Inter-Regular.ttf", CHARSET),
  chord: advances("SpaceGrotesk-Bold.ttf", CHARSET),
  cjkAdvance: cjkAdvance("SourceHanSansCN-Light.ttf"),
};

fs.writeFileSync(OUT, JSON.stringify(table, null, 0), "utf-8");
console.error(`glyphWidths.json écrit (${Object.keys(table.lyric).length} glyphes/police, cjk=${table.cjkAdvance})`);
