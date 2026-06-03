import { transposeChord } from "@/lib/transpose";
import type { ChordProAST, Token } from "@/types/chordPro";

function transposeTokens(tokens: Token[], semitones: number, targetKey: string): Token[] {
  return tokens.map((t) =>
    t.type === "chord"
      ? { ...t, value: transposeChord(t.value, semitones, targetKey) }
      : t
  );
}

/**
 * Return a new AST with all chord tokens transposed.
 * The metadata.key is updated to reflect the new key.
 */
export function transposeAST(ast: ChordProAST, semitones: number, targetKey: string): ChordProAST {
  if (semitones === 0) return ast;

  return {
    metadata: { ...ast.metadata, key: targetKey },
    sections: ast.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({
        ...line,
        tokens: transposeTokens(line.tokens, semitones, targetKey),
      })),
    })),
  };
}
