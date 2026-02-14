import type { Player, BracketMatch } from "./types";

/**
 * Generate a double elimination bracket from player order
 * Uses index-based placement: 0=1st, 1=2nd, 2=3rd, 3=4th, 4-7=5-8
 * @param playerOrder - Ordered array of player IDs
 * @param players - Record of players
 * @param bracketReset - Whether there was a bracket reset in grand finals
 * @returns Array of bracket matches
 */
export function generateBracket(
  playerOrder: string[],
  players: Record<string, Player>,
  bracketReset: boolean = false
): BracketMatch[] {
  const matches: BracketMatch[] = [];

  // Get top 8 players from the order
  const top8PlayerIds = playerOrder.slice(0, 8);
  const top8Players = top8PlayerIds
    .map((id) => players[id])
    .filter((p): p is Player => p !== undefined);

  if (top8Players.length < 8) {
    // Not enough players for a full bracket
    return matches;
  }

  // Players are already in placement order:
  // Index 0 = 1st place (winner)
  // Index 1 = 2nd place
  // Index 2 = 3rd place
  // Index 3 = 4th place
  // Index 4-7 = 5-8 place

  const first = top8Players[0]; // 1st place
  const second = top8Players[1]; // 2nd place
  const third = top8Players[2]; // 3rd place

  // Generate Grand Finals
  const grandFinalsId = "gf-1";
  matches.push({
    id: grandFinalsId,
    round: 99, // Grand finals is the final round
    isWinnersBracket: false, // Grand finals is technically separate
    player1Id: first.id,
    player2Id: second.id,
    winnerId: first.id,
    isGrandFinals: true,
    isGrandFinalsReset: false,
  });

  // If bracket reset, add the second grand finals match
  if (bracketReset) {
    matches.push({
      id: "gf-2",
      round: 100,
      isWinnersBracket: false,
      player1Id: first.id,
      player2Id: second.id,
      winnerId: first.id,
      isGrandFinals: true,
      isGrandFinalsReset: true,
    });
  }

  // Generate Losers Finals (3rd place vs loser of winners finals)
  matches.push({
    id: "lf-1",
    round: 6,
    isWinnersBracket: false,
    player1Id: second.id, // 2nd place came from here
    player2Id: third.id, // 3rd place lost here
    winnerId: second.id,
  });

  // Generate Winners Finals (determines who goes to grand finals from winners side)
  matches.push({
    id: "wf-1",
    round: 3,
    isWinnersBracket: true,
    player1Id: first.id,
    player2Id: second.id, // Could be 2nd or one of the semi-finalists
    winnerId: first.id,
  });

  // This is a simplified bracket generation
  // A full implementation would need more complex logic to determine
  // the exact path each player took through the bracket

  return matches;
}

/**
 * Validate that bracket matches are consistent with players
 * @param matches - Array of bracket matches
 * @param players - Record of players
 * @returns True if bracket is valid
 */
export function validateBracket(
  matches: BracketMatch[],
  players: Record<string, Player>
): boolean {
  // Check that all player IDs in matches exist in players
  for (const match of matches) {
    if (match.player1Id && !players[match.player1Id]) {
      return false;
    }
    if (match.player2Id && !players[match.player2Id]) {
      return false;
    }
    if (match.winnerId && !players[match.winnerId]) {
      return false;
    }
  }

  // Check that winner is one of the two players in the match
  for (const match of matches) {
    if (match.winnerId) {
      if (
        match.winnerId !== match.player1Id &&
        match.winnerId !== match.player2Id
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get all matches for a specific round
 * @param matches - Array of all bracket matches
 * @param round - Round number
 * @param isWinnersBracket - Filter by winners or losers bracket
 * @returns Array of matches for that round
 */
export function getMatchesForRound(
  matches: BracketMatch[],
  round: number,
  isWinnersBracket: boolean
): BracketMatch[] {
  return matches.filter(
    (m) => m.round === round && m.isWinnersBracket === isWinnersBracket
  );
}
