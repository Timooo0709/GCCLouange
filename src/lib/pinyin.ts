/** Retourne true si la chaîne contient des caractères CJK */
export function hasChinese(text: string): boolean {
  return /[一-鿿㐀-䶿豈-﫿]/.test(text);
}

/** Extrait les caractères chinois d'une ligne (sans les accords) */
export function extractChinese(tokens: { type: string; value: string }[]): string {
  return tokens
    .filter((t) => t.type === "lyric")
    .map((t) => t.value)
    .join("");
}
