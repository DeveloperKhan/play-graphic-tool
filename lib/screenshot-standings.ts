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
import { buildNameIndex, matchPlayerName, type NameIndex } from "./name-match";
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
  /** The name bar as it appears in the screenshot (data URL), to check the reading against. */
  nameRef?: string;
  /**
   * Six slots; an id the Pokémon picker doesn't know is left "". `ref` is the tile as it
   * appears in the screenshot (data URL), to compare with what it was recognized as.
   */
  pokemon: Array<{ id: string; isShadow: boolean; confidence: number; ref?: string }>;
}

export interface TeamMatches {
  /** Per standings entry, the key of its team, or null if no screenshot showed that player. */
  assignment: Array<string | null>;
  /** Per team key, the standings entry its name matched, or null if it matched none. */
  entryOf: Map<string, number | null>;
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
function findEntry(team: ScreenshotTeam, index: StandingsIndex): number | null {
  for (const candidate of [team.read, team.dracovizName]) {
    if (!candidate) continue;
    const name = matchPlayerName(candidate, index.names);
    if (name !== null) return index.entryByName.get(name) ?? null;
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
  const best: Array<ScreenshotTeam | null> = entries.map(() => null);
  for (const team of teams) {
    const i = findEntry(team, index);
    entryOf.set(team.key, i);
    if (i === null) continue;
    const current = best[i];
    if (!current || teamConfidence(team) > teamConfidence(current)) best[i] = team;
  }
  return { assignment: best.map((team) => team?.key ?? null), entryOf };
}
