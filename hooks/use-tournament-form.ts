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
 * @param playerCount - Number of players (4, 8, 16, or 32)
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
    return "25-32";
  };

  // Determine default group based on player count (for Usage mode)
  const getDefaultGroup = (index: number): string => {
    const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"];
    const groupCount = playerCount / 2; // Half for winners, half for losers
    return groups[index % groupCount];
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
      players[playerId] = {
        ...basePlayer,
        bracketSide: (i < playerCount / 2 ? "Winners" : "Losers") as "Winners" | "Losers",
        group: getDefaultGroup(i) as any,
      };
    }
  }

  return {
    eventName: "",
    eventYear: new Date().getFullYear().toString(),
    eventType: "Regional",
    overviewType,
    playerCount: playerCount as 4 | 8 | 16 | 32,
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
    },
    bracketLabels: {
      winners: { enabled: true, text: "Winners" },
      losers: { enabled: true, text: "Losers" },
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
