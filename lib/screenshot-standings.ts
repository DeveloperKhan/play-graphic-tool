/**
 * Auto-generate from screenshots: give each Challonge standings entry the team recognized
 * for that player in a set of broadcast screenshots.
 *
 * The overlay prints the player's RK9 screen name, which is not always their Challonge
 * display name, so every entry is matched under both (see player-name-overrides.ts). Names
 * are compared the way OCR readings are matched to Dracoviz names (name-match.ts): case and
 * look-alike characters folded, with a couple of edits allowed on longer names.
 */

import type { StandingEntry } from "./challonge";
import { buildNameIndex, editDistance, foldName, matchPlayerName, type NameIndex } from "./name-match";
import { applyNameOverride } from "./player-name-overrides";

/** One team grid recognized in a screenshot. */
export interface ScreenshotTeam {
  key: string;
  /** The name as OCR read it off the overlay. */
  read: string | null;
  /** The closest Dracoviz player name, when it differs from the reading. */
  dracovizName: string | null;
  country: string | null;
  /** The screenshot it came from, and the side for a full broadcast frame. */
  source: string;
  side?: "left" | "right" | null;
  /** The name bar as it appears in the screenshot (data URL), to check the reading against. */
  nameRef?: string;
  /** Where the name bar is in the screenshot, [x0, y0, x1, y1] as fractions of its size. */
  nameBox?: [number, number, number, number];
  /** Which recognizer read it, and its models' version when known. */
  engine?: "browser" | "server";
  modelVersion?: string | null;
  /** Six slots, in grid order. */
  pokemon: ScreenshotSlot[];
}

export interface ScreenshotSlot {
  /** An id the Pokémon picker knows, or "" */
  id: string;
  isShadow: boolean;
  confidence: number;
  /** The tile as it appears in the screenshot (data URL), to compare with what it was read as */
  ref?: string;
  /** Where the tile is in the screenshot, [x0, y0, x1, y1] as fractions of its size */
  box?: [number, number, number, number];
  /** Set by hand in the review (its confidence is then 1) */
  edited?: boolean;
  /** What the recognizer read before a hand edit */
  predicted?: { id: string; isShadow: boolean; confidence: number };
}

/** How a team's name matched its standings entry */
export interface NameMatch {
  /** "read": the name as OCR read it; "dracoviz": only its Dracoviz correction matched */
  via: "read" | "dracoviz";
  /** Letters that differed once case and look-alike characters were folded */
  edits: number;
}

export interface TeamMatches {
  /** Per standings entry, the key of its team, or null if no screenshot showed that player. */
  assignment: Array<string | null>;
  /** Per team key, the standings entry its name matched, or null if it matched none. */
  entryOf: Map<string, number | null>;
  /** Per team key that matched an entry, how its name matched. */
  nameMatches: Map<string, NameMatch>;
}

export function teamConfidence(team: ScreenshotTeam): number {
  if (team.pokemon.length === 0) return 0;
  return team.pokemon.reduce((sum, p) => sum + (p.id ? p.confidence : 0), 0) / team.pokemon.length;
}

interface StandingsIndex {
  names: NameIndex;
  entryByName: Map<string, number>;
}

function buildStandingsIndex(entries: StandingEntry[]): StandingsIndex {
  const entryByName = new Map<string, number>();
  entries.forEach((entry, i) => {
    for (const name of [entry.name, applyNameOverride(entry.name)]) {
      if (!entryByName.has(name)) entryByName.set(name, i);
    }
  });
  return { names: buildNameIndex([...entryByName.keys()]), entryByName };
}

/** The standings entry a team belongs to: by the name as read, else by its Dracoviz match. */
function findEntry(team: ScreenshotTeam, index: StandingsIndex): { entry: number; name: NameMatch } | null {
  const candidates = [
    ["read", team.read],
    ["dracoviz", team.dracovizName],
  ] as const;
  for (const [via, candidate] of candidates) {
    if (!candidate) continue;
    const name = matchPlayerName(candidate, index.names);
    const entry = name === null ? undefined : index.entryByName.get(name);
    if (name !== null && entry !== undefined) {
      return { entry, name: { via, edits: editDistance(foldName(name), foldName(candidate)) } };
    }
  }
  return null;
}

/**
 * Match screenshot teams to standings entries. Teams are matched against the whole standings,
 * not just the graphic's cut, so a player outside the cut can't be mistaken for a similarly
 * named one inside it. When several screenshots show the same player, the most confident
 * recognition is used.
 */
export function matchTeamsToStandings(entries: StandingEntry[], teams: ScreenshotTeam[]): TeamMatches {
  const index = buildStandingsIndex(entries);
  const entryOf = new Map<string, number | null>();
  const nameMatches = new Map<string, NameMatch>();
  const best: Array<ScreenshotTeam | null> = entries.map(() => null);
  for (const team of teams) {
    const found = findEntry(team, index);
    entryOf.set(team.key, found?.entry ?? null);
    if (!found) continue;
    nameMatches.set(team.key, found.name);
    const current = best[found.entry];
    if (!current || teamConfidence(team) > teamConfidence(current)) best[found.entry] = team;
  }
  return { assignment: best.map((team) => team?.key ?? null), entryOf, nameMatches };
}

/** The Pokémon a team is least sure of, by slot */
export function weakestSlot(team: ScreenshotTeam): { slot: number; confidence: number } {
  return team.pokemon.reduce(
    (weakest, p, slot) => {
      const confidence = p.id ? p.confidence : 0;
      return confidence < weakest.confidence ? { slot, confidence } : weakest;
    },
    { slot: 0, confidence: 1 }
  );
}

/**
 * How much a name match can be trusted, 0-1. Folded-equal names are certain; each letter OCR
 * got wrong, or needing the Dracoviz correction to match at all, makes a wrong player likelier.
 * Without a match (a team picked by hand) the name is the user's call: certain.
 */
export function nameMatchConfidence(match: NameMatch | undefined): number {
  if (!match) return 1;
  const byEdits = [1, 0.8, 0.65][Math.min(match.edits, 2)];
  return match.via === "dracoviz" ? Math.min(byEdits, 0.7) : byEdits;
}

/** How sure an import is, 0-1: the weaker of its least confident Pokémon and its name match */
export function importConfidence(team: ScreenshotTeam, match: NameMatch | undefined): number {
  return Math.min(weakestSlot(team).confidence, nameMatchConfidence(match));
}
