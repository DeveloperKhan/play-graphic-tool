/**
 * Order the players already in the form from a Challonge bracket.
 *
 * Auto-Generate builds a form from scratch and so can take names straight from
 * the bracket. Bulk Reorder is the other half of that: the teams are already
 * entered - typed in, imported from RK9, or read off screenshots - and only
 * their order is wrong. So the bracket is used for nothing but its ordering,
 * and every player in the form keeps the data they already have.
 *
 * Players the bracket doesn't mention keep their relative order behind the ones
 * it does, rather than being shuffled, so a bracket that covers only part of
 * the form leaves the rest alone.
 */

import type { StandingEntry } from "./challonge";
import { buildNameIndex, matchPlayerName } from "./name-match";
import { applyNameOverride, normalizePlayerName } from "./player-name-overrides";
import { mapPlayerName } from "./rk9-import";

export interface ReorderPlayer {
  id: string;
  name: string;
}

/**
 * How a bracket entry was tied to a player in the form.
 *
 * "exact" - the names agree once decoration and the known override tables are
 * applied. "close" - they only agree allowing for the look-alike characters
 * OCR confuses, which is what names imported from broadcast screenshots carry.
 */
export type ReorderMatchKind = "exact" | "close";

export interface ReorderMatch {
  /** 0-based position this player takes in the new order */
  position: number;
  playerId: string;
  /** The name as it stands in the form */
  playerName: string;
  /** The name Challonge lists, which may be spelled differently */
  entryName: string;
  kind: ReorderMatchKind;
}

export interface ReorderPlan {
  /** Every player id in the form, in the new order */
  order: string[];
  /** The players the bracket placed, in bracket order */
  matched: ReorderMatch[];
  /** Players the bracket doesn't mention, in the order they already had */
  unmatched: ReorderPlayer[];
  /** Bracket entries with nobody in the form to match */
  unusedEntries: number;
}

/**
 * The spellings a bracket entry could appear under in the form.
 *
 * A name can reach the form from Challonge directly, or by way of RK9, which
 * both renames some players outright (`CHALLONGE_TO_RK9_NAMES`) and restyles
 * others (`PLAYER_NAME_MAPPINGS`). All three are tried so a form built by any
 * of the import paths still matches.
 */
function candidateNames(entryName: string): string[] {
  const overridden = applyNameOverride(entryName);
  return [...new Set([entryName, overridden, mapPlayerName(overridden)])].map(
    normalizePlayerName
  );
}

/**
 * Work out where each player in the form belongs, given a bracket's standings.
 *
 * `entries` is the standings in bracket order - final placings for a finished
 * event, live matchups for one still running - and `players` is the form's
 * current order. Matching runs in two passes over the entries so that an
 * earlier entry always has first claim on a player: every exact name match is
 * taken first, and only then are the leftovers matched on near spellings.
 */
export function planReorder(
  entries: StandingEntry[],
  players: ReorderPlayer[]
): ReorderPlan {
  const remaining = new Map(players.map((player) => [player.id, player]));

  // Normalized name -> the ids that spell it that way, in form order
  const idsByName = new Map<string, string[]>();
  for (const player of players) {
    const key = normalizePlayerName(player.name);
    if (!key) continue; // A slot with no name can't be matched
    idsByName.set(key, [...(idsByName.get(key) ?? []), player.id]);
  }

  const matched: ReorderMatch[] = [];
  const claim = (playerId: string, entryName: string, kind: ReorderMatchKind) => {
    const player = remaining.get(playerId);
    if (!player) return false;
    remaining.delete(playerId);
    matched.push({
      position: matched.length,
      playerId,
      playerName: player.name,
      entryName,
      kind,
    });
    return true;
  };

  const pending: StandingEntry[] = [];

  for (const entry of entries) {
    const hit = candidateNames(entry.name)
      .flatMap((name) => idsByName.get(name) ?? [])
      .find((id) => remaining.has(id));

    if (!hit || !claim(hit, entry.name, "exact")) pending.push(entry);
  }

  // Second pass: names that only agree allowing for OCR's look-alike
  // characters. The index is rebuilt from whoever is still unclaimed, so a
  // close match can never take a player an exact match already has.
  for (const entry of pending) {
    if (remaining.size === 0) break;

    const unclaimed = [...remaining.values()].filter(
      (player) => normalizePlayerName(player.name) !== ""
    );
    if (unclaimed.length === 0) break;

    const index = buildNameIndex(unclaimed.map((player) => player.name));
    const overridden = mapPlayerName(applyNameOverride(entry.name));
    const closest = matchPlayerName(overridden, index);
    if (!closest) continue;

    const player = unclaimed.find((candidate) => candidate.name === closest);
    if (player) claim(player.id, entry.name, "close");
  }

  // Whoever the bracket never named keeps the order they already had
  const unmatched = players.filter((player) => remaining.has(player.id));

  return {
    order: [...matched.map((match) => match.playerId), ...unmatched.map((p) => p.id)],
    matched,
    unmatched,
    unusedEntries: entries.length - matched.length,
  };
}
