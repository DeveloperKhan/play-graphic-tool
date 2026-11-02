/**
 * Match a player name read by OCR to the closest known Dracoviz player name.
 *
 * Overlays print names in capitals and OCR mixes up look-alike characters
 * (PVPDAVIDO7 for PvPDavid07, REIS20CCASION for Reis2Occasion), so names are
 * compared after folding case and those characters together, allowing a couple
 * of further edits for anything OCR got wrong outright.
 */

// Characters OCR confuses on overlay fonts, folded to one representative each.
const CONFUSABLE: Record<string, string> = {
  "0": "o",
  "1": "i",
  l: "i",
  "5": "s",
  "8": "b",
  "2": "z",
};

export function foldName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/[01l582]/g, (c) => CONFUSABLE[c]);
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

export interface NameIndex {
  byFolded: Map<string, string[]>;
  entries: Array<{ name: string; folded: string }>;
}

export function buildNameIndex(names: string[]): NameIndex {
  const byFolded = new Map<string, string[]>();
  const entries: NameIndex["entries"] = [];
  for (const name of names) {
    const folded = foldName(name);
    if (!folded) continue;
    byFolded.set(folded, [...(byFolded.get(folded) ?? []), name]);
    entries.push({ name, folded });
  }
  return { byFolded, entries };
}

/** Edits tolerated beyond look-alike characters; short names must match exactly. */
function allowedEdits(length: number): number {
  if (length < 5) return 0;
  if (length < 9) return 1;
  return 2;
}

/**
 * The known name closest to an OCR reading, or null if none is close enough.
 * Among equally close candidates the one whose raw spelling is nearest wins.
 */
export function matchPlayerName(raw: string, index: NameIndex): string | null {
  const folded = foldName(raw);
  if (!folded) return null;
  const byRaw = (candidates: string[]) =>
    candidates.reduce((best, name) =>
      editDistance(name.toLowerCase(), raw.toLowerCase()) < editDistance(best.toLowerCase(), raw.toLowerCase())
        ? name
        : best
    );

  const exact = index.byFolded.get(folded);
  if (exact) return byRaw(exact);

  const limit = allowedEdits(folded.length);
  if (limit === 0) return null;
  let bestDistance = limit + 1;
  let best: string[] = [];
  for (const entry of index.entries) {
    if (Math.abs(entry.folded.length - folded.length) > limit) continue;
    const d = editDistance(entry.folded, folded);
    if (d > limit) continue;
    if (d < bestDistance) {
      bestDistance = d;
      best = [entry.name];
    } else if (d === bestDistance) {
      best.push(entry.name);
    }
  }
  // Several different names equally close: too ambiguous to pick one.
  if (best.length === 0 || new Set(best.map(foldName)).size > 1) return null;
  return byRaw(best);
}
