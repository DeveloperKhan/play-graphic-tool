import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tournamentSchema } from "@/lib/schema";
import type { TournamentData, Player, BracketPositions } from "@/lib/types";

/**
 * Create default bracket positions (all null)
 * Maps to all 21 cells in the Top 8 double elimination bracket
 */
function createDefaultBracketPositions(): BracketPositions {
  return {
    // Winners Semifinals
    winnersSemis1Top: null,
    winnersSemis1Bottom: null,
    winnersSemis2Top: null,
    winnersSemis2Bottom: null,
    // Winners Finals
    winnersFinalsTop: null,
    winnersFinalsBottom: null,
    // Losers Round 1
    losersR1Match1Top: null,
    losersR1Match1Bottom: null,
    losersR1Match2Top: null,
    losersR1Match2Bottom: null,
    // Losers Round 2
    losersR2Top: null,
    losersR2Bottom: null,
    // Losers Round 3
    losersR3Top: null,
    losersR3Bottom: null,
    // Losers Semifinals
    losersSemisTop: null,
    losersSemisBottom: null,
    // Losers Finals
    losersFinalsTop: null,
    losersFinalsBottom: null,
    // Grand Finals
    grandFinalsWinners: null,
    grandFinalsLosers: null,
    // Champion
    champion: null,
  };
}

/**
 * Generate a unique player ID
 */
function generatePlayerId(index: number): string {
  return `player-${index + 1}`;
}

/**
 * Create default tournament data for form initialization
 * @param playerCount - Number of players (4, 8, 16, 32, or 64)
 * @param overviewType - Overview type (defaults to "Usage")
 */
export function createDefaultTournamentData(
  playerCount: number = 16,
  overviewType: "Usage" | "Bracket" | "None" = "Usage"
): TournamentData {
  const players: Record<string, Player> = {};
  const playerOrder: string[] = [];

  // Create players with empty data
  // Player order determines column placement:
  // - Top 16: 0-3 Winners Col 1, 4-7 Winners Col 2, 8-11 Losers Col 1, 12-15 Losers Col 2
  // - Top 64: 0-31 Winners bracket, 32-63 Losers bracket
  for (let i = 0; i < playerCount; i++) {
    const playerId = generatePlayerId(i);
    playerOrder.push(playerId);

    players[playerId] = {
      id: playerId,
      name: "",
      team: Array(6)
        .fill(null)
        .map(() => ({
          id: "",
          isShadow: false,
        })),
      flags: [""],
    };
  }

  return {
    titleLines: ["", "", ""],
    eventYear: new Date().getFullYear().toString(),
    eventType: "Regional",
    overviewType,
    playerCount: playerCount as 4 | 8 | 16 | 32 | 64,
    bracketReset: false,
    players,
    playerOrder,
    bracketPositions: createDefaultBracketPositions(),
    bracketMatches: [],
    bracketPairings: [],
    columnWrappers: {
      winners1: { mode: "lines", text: "" },
      winners2: { mode: "lines", text: "" },
      losers1: { mode: "lines", text: "" },
      losers2: { mode: "lines", text: "" },
      // Top 64 additional columns (16 blocks: 8 per graphic, 4 players per block)
      ...(playerCount === 64 ? {
        // Winners graphic columns
        winners1a: { mode: "lines", text: "" },
        winners1b: { mode: "lines", text: "" },
        winners2a: { mode: "lines", text: "" },
        winners2b: { mode: "lines", text: "" },
        winners3a: { mode: "lines", text: "" },
        winners3b: { mode: "lines", text: "" },
        winners4a: { mode: "lines", text: "" },
        winners4b: { mode: "lines", text: "" },
        // Losers graphic columns
        losers1a: { mode: "lines", text: "" },
        losers1b: { mode: "lines", text: "" },
        losers2a: { mode: "lines", text: "" },
        losers2b: { mode: "lines", text: "" },
        losers3a: { mode: "lines", text: "" },
        losers3b: { mode: "lines", text: "" },
        losers4a: { mode: "lines", text: "" },
        losers4b: { mode: "lines", text: "" },
      } : {}),
    },
    bracketLabels: {
      winners: { enabled: true, text: "Winners Bracket" },
      losers: { enabled: true, text: "Losers Bracket" },
    },
    eventDateRange: {
      startDate: "",
      endDate: "",
    },
  };
}

/**
 * Custom hook for tournament form state management
 */
export function useTournamentForm(playerCount: number = 16) {
  const form = useForm<TournamentData>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: createDefaultTournamentData(playerCount),
    mode: "onChange", // Live validation for better UX
  });

  return form;
}
