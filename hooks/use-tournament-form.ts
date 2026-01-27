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
 */
export function createDefaultTournamentData(
  playerCount: number = 16
): TournamentData {
  const players: Record<string, Player> = {};
  const playerOrder: string[] = [];

  // Determine default placements based on player count
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

  // Create players with empty data
  for (let i = 0; i < playerCount; i++) {
    const playerId = generatePlayerId(i);
    playerOrder.push(playerId);

    players[playerId] = {
      id: playerId,
      name: "",
      placement: getDefaultPlacement(i),
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
    eventName: "",
    eventType: "Regional",
    overviewType: "Usage",
    playerCount: playerCount as 4 | 8 | 16 | 32,
    bracketReset: false,
    players,
    playerOrder,
    bracketMatches: [],
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
