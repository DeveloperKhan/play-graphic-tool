/**
 * Graphic data utilities for parsing CSV and preparing graphic data
 */

import type { BracketSide, BracketGroup, UsageStats, TournamentData, ColumnId, ColumnWrapperConfig, BracketLabels, OverviewType, Placement, EventDateRange } from "./types";

export interface GraphicPlayer {
  name: string;
  bracketSide: BracketSide;
  group: BracketGroup;
  placement?: Placement;
  flags: string[];
  team: Array<{
    name: string;
    speciesId: string;
    isShadow: boolean;
  }>;
}

export interface GraphicData {
  titleLines: [string, string, string]; // 3 lines for the title
  eventYear: string;
  eventType: "Regional" | "International" | "Worlds" | "Generic";
  overviewType: OverviewType;
  playerCount: number; // 4, 8, 16, 32, or 64
  players: GraphicPlayer[];
  usageStats: UsageStats[];
  columnWrappers?: Partial<Record<ColumnId, ColumnWrapperConfig>>;
  bracketLabels?: BracketLabels;
  bracketReset?: boolean;
  eventDateRange: EventDateRange;
}

/**
 * Parse Pokemon name and determine if it's shadow
 * Examples: "Altaria (Shadow)" -> { name: "Altaria", isShadow: true }
 *           "Stunfisk" -> { name: "Stunfisk", isShadow: false }
 *           "Moltres (Galarian)" -> { name: "Moltres (Galarian)", isShadow: false }
 */
export function parsePokemonName(rawName: string): {
  name: string;
  speciesId: string;
  isShadow: boolean;
} {
  const isShadow = rawName.includes("(Shadow)");
  // Remove "(Shadow)" but keep other forms like "(Galarian)"
  const name = rawName.replace(" (Shadow)", "").trim();

  // Convert to speciesId format (lowercase, spaces to underscores)
  let speciesId = name.toLowerCase().replace(/\s+/g, "_");
  // Handle special forms like "Moltres (Galarian)" -> "moltres_galarian"
  speciesId = speciesId.replace(/[()]/g, "").replace(/_+/g, "_");

  return { name, speciesId, isShadow };
}

/**
 * Parse a bracket group from CSV format
 * Examples: "A Winner" -> { group: "A", side: "Winners" }
 *           "H Loser" -> { group: "H", side: "Losers" }
 */
export function parseBracketGroup(groupStr: string): {
  group: BracketGroup;
  side: BracketSide;
} {
  const parts = groupStr.trim().split(" ");
  const group = parts[0].toUpperCase() as BracketGroup;
  const sideRaw = parts[1]?.toLowerCase() || "";

  // Handle "Winner", "Loser", "Lower" (typo in CSV)
  const side: BracketSide =
    sideRaw.includes("winner") ? "Winners" : "Losers";

  return { group, side };
}

/**
 * Calculate Pokemon usage statistics from player teams
 */
export function calculateUsageStats(
  players: GraphicPlayer[],
  topN: number = 12
): UsageStats[] {
  const usageMap = new Map<
    string,
    { count: number; shadowCount: number; name: string }
  >();

  for (const player of players) {
    for (const pokemon of player.team) {
      const key = pokemon.name.toLowerCase();
      const existing = usageMap.get(key) || {
        count: 0,
        shadowCount: 0,
        name: pokemon.name,
      };

      existing.count += 1;
      if (pokemon.isShadow) {
        existing.shadowCount += 1;
      }

      usageMap.set(key, existing);
    }
  }

  // Convert to array and sort by count (descending)
  const stats: UsageStats[] = Array.from(usageMap.values())
    .map((item) => ({
      pokemon: item.name,
      count: item.count,
      shadowCount: item.shadowCount,
    }))
    .sort((a, b) => b.count - a.count);

  return stats.slice(0, topN);
}

/**
 * Parse CSV data into GraphicPlayer array
 */
export function parseCSVData(csvContent: string): GraphicPlayer[] {
  const lines = csvContent.trim().split("\n");
  const players: GraphicPlayer[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Parse CSV (handling commas within quotes)
    const columns = line.split(",");
    if (columns.length < 8) continue;

    const groupInfo = parseBracketGroup(columns[0]);
    const playerName = columns[1].trim();

    // Parse Pokemon 1-6 (columns 2-7)
    const team: GraphicPlayer["team"] = [];
    for (let j = 2; j <= 7; j++) {
      const pokemonStr = columns[j]?.trim();
      if (pokemonStr) {
        team.push(parsePokemonName(pokemonStr));
      }
    }

    players.push({
      name: playerName,
      bracketSide: groupInfo.side,
      group: groupInfo.group,
      flags: ["US"], // Default to US for now (can be enhanced later)
      team,
    });
  }

  return players;
}

/**
 * Convert TournamentData (from form) to GraphicData (for graphic rendering)
 */
export function convertToGraphicData(tournamentData: TournamentData): GraphicData {
  const graphicPlayers: GraphicPlayer[] = tournamentData.playerOrder
    .map((playerId) => {
      const player = tournamentData.players[playerId];
      if (!player) return null;

      const graphicPlayer: GraphicPlayer = {
        name: player.name || "",
        bracketSide: player.bracketSide || "Winners",
        group: player.group || "A",
        flags: player.flags.filter((f) => f.length > 0),
        team: player.team.map((pokemon) => ({
          // Use the speciesId as the name - the sprite component will handle lookup
          name: pokemon.id,
          speciesId: pokemon.id,
          isShadow: pokemon.isShadow,
        })),
      };

      // Add placement if in bracket mode
      if (player.placement !== undefined) {
        graphicPlayer.placement = player.placement;
      }

      return graphicPlayer;
    })
    .filter((p): p is GraphicPlayer => p !== null);

  return {
    titleLines: tournamentData.titleLines || ["", "", ""],
    eventYear: tournamentData.eventYear,
    eventType: tournamentData.eventType,
    overviewType: tournamentData.overviewType,
    playerCount: tournamentData.playerCount,
    players: graphicPlayers,
    usageStats: calculateUsageStats(graphicPlayers, 12),
    columnWrappers: tournamentData.columnWrappers,
    bracketLabels: tournamentData.bracketLabels,
    bracketReset: tournamentData.bracketReset,
    eventDateRange: tournamentData.eventDateRange,
  };
}

/**
 * Get players organized by bracket side and column (for Top 16)
 */
export function getPlayersByColumn(data: GraphicData) {
  const winnersCol1 = data.players.filter(
    (p) => p.bracketSide === "Winners" && ["A", "B", "C", "D"].includes(p.group)
  );
  const winnersCol2 = data.players.filter(
    (p) => p.bracketSide === "Winners" && ["E", "F", "G", "H"].includes(p.group)
  );
  const losers = data.players.filter((p) => p.bracketSide === "Losers");

  return { winnersCol1, winnersCol2, losers };
}

/**
 * Get players organized into 5 columns for Top 64 graphics
 * Each graphic (Winners or Losers) has 32 players in 5 columns:
 * - Columns 1-2 (left side, below usage): 4 players each (groups A-B, C-D)
 * - Columns 3-5 (right side, full height): 8 players each (groups E-H, I-L, M-P)
 * Players are sorted by group so same-group players are paired (A, A, B, B, etc.)
 */
export function getPlayersByColumn64(players: GraphicPlayer[]) {
  const groupOrder: Record<string, number> = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
    I: 9, J: 10, K: 11, L: 12, M: 13, N: 14, O: 15, P: 16,
  };

  // Sort players by group to ensure same-group players are adjacent
  const sortByGroup = (a: GraphicPlayer, b: GraphicPlayer) =>
    (groupOrder[a.group] ?? 99) - (groupOrder[b.group] ?? 99);

  // Left side columns (below usage section) - 4 players each (2 pairs)
  const col1 = players.filter((p) => ["A", "B"].includes(p.group)).sort(sortByGroup);
  const col2 = players.filter((p) => ["C", "D"].includes(p.group)).sort(sortByGroup);
  // Right side columns (full height) - 8 players each (4 pairs)
  const col3 = players.filter((p) => ["E", "F", "G", "H"].includes(p.group)).sort(sortByGroup);
  const col4 = players.filter((p) => ["I", "J", "K", "L"].includes(p.group)).sort(sortByGroup);
  const col5 = players.filter((p) => ["M", "N", "O", "P"].includes(p.group)).sort(sortByGroup);

  return { col1, col2, col3, col4, col5 };
}

/**
 * Split GraphicData for Top 64 into Winners and Losers data
 * Usage stats are COMBINED across all 64 players and shown on both graphics
 */
export function splitGraphicDataFor64(data: GraphicData): {
  winnersData: GraphicData;
  losersData: GraphicData;
} {
  const winnersPlayers = data.players.filter((p) => p.bracketSide === "Winners");
  const losersPlayers = data.players.filter((p) => p.bracketSide === "Losers");

  // Usage stats are calculated from ALL 64 players (combined)
  // Both graphics show the same usage stats
  const combinedUsageStats = calculateUsageStats(data.players, 12);

  const winnersData: GraphicData = {
    ...data,
    players: winnersPlayers,
    usageStats: combinedUsageStats,
  };

  const losersData: GraphicData = {
    ...data,
    players: losersPlayers,
    usageStats: combinedUsageStats,
  };

  return { winnersData, losersData };
}
