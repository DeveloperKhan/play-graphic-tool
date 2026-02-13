import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tournamentSchema } from "@/lib/schema";
import type { TournamentData, Placement, Player } from "@/lib/types";

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

  // Determine default placements based on player count (for Bracket mode)
  const getDefaultPlacement = (index: number): Placement => {
    if (index === 0) return 1;
    if (index === 1) return 2;
    if (index === 2) return 3;
    if (index === 3) return 4;
    if (index < 8) return "5-8";
    if (index < 16) return "9-16";
    if (index < 24) return "17-24";
    if (index < 32) return "25-32";
    return "33-64";
  };

  // Determine default group and bracket side based on player count (for Usage mode)
  const getDefaultBracketInfo = (index: number): { bracketSide: "Winners" | "Losers"; group: string } => {
    const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"];

    if (playerCount === 64) {
      // Top 64: First 32 are Winners (2 per group A-P), next 32 are Losers (2 per group A-P)
      const bracketSide = index < 32 ? "Winners" : "Losers";
      const indexInBracket = index < 32 ? index : index - 32;
      const group = groups[Math.floor(indexInBracket / 2)];
      return { bracketSide, group };
    } else {
      // Other counts: first half Winners, second half Losers
      const bracketSide = index < playerCount / 2 ? "Winners" : "Losers";
      const groupCount = Math.min(playerCount / 2, 8); // Max 8 groups for Top 16 and below
      const group = groups[index % groupCount];
      return { bracketSide, group };
    }
  };

  // Create players with empty data
  for (let i = 0; i < playerCount; i++) {
    const playerId = generatePlayerId(i);
    playerOrder.push(playerId);

    const basePlayer = {
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

    // Add mode-specific fields
    if (overviewType === "Bracket") {
      players[playerId] = {
        ...basePlayer,
        placement: getDefaultPlacement(i),
      };
    } else {
      // Usage mode defaults
      const { bracketSide, group } = getDefaultBracketInfo(i);
      players[playerId] = {
        ...basePlayer,
        bracketSide,
        group: group as any,
      };
    }
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
    bracketMatches: [],
    bracketPairings: [],
    columnWrappers: {
      winners1: { mode: "lines", text: "" },
      winners2: { mode: "lines", text: "" },
      losers1: { mode: "lines", text: "" },
      losers2: { mode: "lines", text: "" },
      // Top 64 additional columns (5 columns per side)
      ...(playerCount === 64 ? {
        winners3: { mode: "lines", text: "" },
        winners4: { mode: "lines", text: "" },
        winners5: { mode: "lines", text: "" },
        losers3: { mode: "lines", text: "" },
        losers4: { mode: "lines", text: "" },
        losers5: { mode: "lines", text: "" },
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
