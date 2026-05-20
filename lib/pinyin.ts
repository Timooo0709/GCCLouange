import { pinyin as pinyinPro } from "pinyin-pro";

/** Génère le pinyin d'un texte chinois avec tons (ex: "nǐ hǎo") */
export function generatePinyin(text: string): string {
  // Retire les accords ChordPro et le pinyin manuel déjà présent
  const charsOnly = text.replace(/\[.*?\]/g, "").replace(/\s{3,}.*$/, "");
  return pinyinPro(charsOnly, {
    toneType: "symbol",
    type: "string",
    separator: " ",
  });
}

/** Retourne true si la chaîne contient des caractères CJK */
export function hasChinese(text: string): boolean {
  return /[一-鿿㐀-䶿豈-﫿]/.test(text);
}

/**
 * À partir d'une ligne ChordPro (tokens + champ pinyin),
 * retourne le pinyin à afficher :
 * - le pinyin manuel s'il est fourni dans le .cho
 * - sinon génère automatiquement via pinyin-pro
 */
export function resolvePinyin(lyricText: string, manualPinyin: string | null): string | null {
  if (!hasChinese(lyricText)) return null;
  if (manualPinyin) return manualPinyin;
  return generatePinyin(lyricText);
}

/** Extrait les caractères chinois d'une ligne (sans les accords) */
export function extractChinese(tokens: { type: string; value: string }[]): string {
  return tokens
    .filter((t) => t.type === "lyric")
    .map((t) => t.value)
    .join("");
}
