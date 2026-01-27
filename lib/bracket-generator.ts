import type { Player, BracketMatch, Placement } from "./types";

/**
 * Generate a double elimination bracket from player placements
 * This auto-generates the bracket structure based on final placements
 * @param players - Record of players with their placements
 * @param bracketReset - Whether there was a bracket reset in grand finals
 * @returns Array of bracket matches
 */
export function generateBracket(
  players: Record<string, Player>,
  bracketReset: boolean = false
): BracketMatch[] {
  const matches: BracketMatch[] = [];

  // Get top 8 players sorted by placement
  const top8Players = Object.values(players)
    .filter((p) => {
      const placement = p.placement;
      return (
        placement === 1 ||
        placement === 2 ||
        placement === 3 ||
        placement === 4 ||
        placement === "5-8"
      );
    })
    .sort((a, b) => comparePlacements(a.placement, b.placement));

  if (top8Players.length < 8) {
    // Not enough players for a full bracket
    return matches;
  }

  // Based on final placements, we can infer the bracket structure
  // 1st place: Won grand finals
  // 2nd place: Lost grand finals (from winners or losers bracket)
  // 3rd place: Lost in losers finals
  // 4th place: Lost earlier in losers bracket
  // 5-8: Lost in winners bracket or earlier in losers bracket

  const first = top8Players[0]; // 1st place
  const second = top8Players[1]; // 2nd place
  const third = top8Players[2]; // 3rd place
  const fourth = top8Players[3]; // 4th place
  const fifth_eighth = top8Players.slice(4, 8); // 5-8 place

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
 * Compare two placements for sorting
 * @param a - First placement
 * @param b - Second placement
 * @returns Comparison result (-1, 0, 1)
 */
function comparePlacements(a: Placement, b: Placement): number {
  const order: Placement[] = [1, 2, 3, 4, "5-8", "9-16", "17-24", "25-32"];
  return order.indexOf(a) - order.indexOf(b);
}

/**
 * Validate that bracket matches are consistent with player placements
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
