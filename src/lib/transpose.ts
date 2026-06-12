// Chromatic scale — index = semitone from C
const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// Enharmonic equivalents not in the standard arrays
const EXTRAS: Record<string, number> = { "E#": 5, "Fb": 4, "B#": 0, "Cb": 11 };

// Keys that prefer flats
const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb", "Fb"]);

function noteToIndex(note: string): number {
  const i = SHARPS.indexOf(note);
  if (i !== -1) return i;
  const j = FLATS.indexOf(note);
  if (j !== -1) return j;
  if (note in EXTRAS) return EXTRAS[note];
  return -1;
}

function indexToNote(index: number, useFlatKey: boolean): string {
  const i = ((index % 12) + 12) % 12;
  return useFlatKey ? FLATS[i] : SHARPS[i];
}

/**
 * Transpose a single chord string by `semitones`.
 * `targetKey` determines enharmonic preference (sharps vs flats).
 * Preserves quality, extensions, slash bass.
 */
export function transposeChord(chord: string, semitones: number, targetKey: string): string {
  if (semitones === 0) return chord;

  const useFlatKey = FLAT_KEYS.has(targetKey);

  // Parse root (1-2 chars) + quality + optional slash bass "/X"
  const match = chord.match(/^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/);
  if (!match) return chord;

  const [, root, quality, bass] = match;

  const rootIdx = noteToIndex(root);
  if (rootIdx === -1) return chord;

  const newRoot = indexToNote(rootIdx + semitones, useFlatKey);
  const newBass = bass
    ? "/" + indexToNote(noteToIndex(bass) + semitones, useFlatKey)
    : "";

  return newRoot + quality + newBass;
}

/**
 * Return the target key after transposition, with proper enharmonic.
 */
export function getTransposedKey(originalKey: string, semitones: number): string {
  const idx = noteToIndex(originalKey);
  if (idx === -1) return originalKey;
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  const sharpVersion = SHARPS[newIdx];
  const flatVersion  = FLATS[newIdx];
  const key = FLAT_KEYS.has(flatVersion) ? flatVersion : sharpVersion;
  return key;
}

/** All keys in display order for the selector */
export const ALL_KEYS = [
  "C", "C#", "Db", "D", "D#", "Eb", "E", "E#", "Fb", "F", "F#", "Gb",
  "G", "G#", "Ab", "A", "A#", "Bb", "B",
];

/**
 * Compute semitone offset to go from `fromKey` to `toKey` (shortest path, -6..+5).
 */
export function semitonesTo(fromKey: string, toKey: string): number {
  const from = noteToIndex(fromKey);
  const to   = noteToIndex(toKey);
  if (from === -1 || to === -1) return 0;
  let diff = ((to - from) % 12 + 12) % 12;
  if (diff > 6) diff -= 12; // prefer shorter route
  return diff;
}
