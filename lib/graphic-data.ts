/**
 * Graphic data utilities for parsing CSV and preparing graphic data
 */

import type { UsageStats, TournamentData, ColumnId, ColumnWrapperConfig, BracketLabels, OverviewType, EventDateRange } from "./types";

/**
 * Resolved bracket positions for graphic display
 * Contains player names (resolved from IDs) instead of player IDs
 */
export interface ResolvedBracketPositions {
  first: string | null;
  second: string | null;
  third: string | null;
  fourth: string | null;
  fifth1: string | null;
  fifth2: string | null;
  fifth3: string | null;
  fifth4: string | null;
}

export interface GraphicPlayer {
  name: string;
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
  bracketPositions?: ResolvedBracketPositions;
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
 * Note: CSV parsing returns players in order - column placement is based on array index
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
      flags: ["US"], // Default to US for now (can be enhanced later)
      team,
    });
  }

  return players;
}

/**
 * Convert TournamentData (from form) to GraphicData (for graphic rendering)
 * Players are ordered by playerOrder array - index determines column placement
 */
export function convertToGraphicData(tournamentData: TournamentData): GraphicData {
  const graphicPlayers: GraphicPlayer[] = tournamentData.playerOrder
    .map((playerId) => {
      const player = tournamentData.players[playerId];
      if (!player) return null;

      const graphicPlayer: GraphicPlayer = {
        name: player.name || "",
        flags: player.flags.filter((f) => f.length > 0),
        team: player.team.map((pokemon) => ({
          // Use the speciesId as the name - the sprite component will handle lookup
          name: pokemon.id,
          speciesId: pokemon.id,
          isShadow: pokemon.isShadow,
        })),
      };

      return graphicPlayer;
    })
    .filter((p): p is GraphicPlayer => p !== null);

  // Resolve bracket positions from player IDs to player names
  const resolvedBracketPositions: ResolvedBracketPositions | undefined =
    tournamentData.bracketPositions
      ? {
          first: tournamentData.bracketPositions.first
            ? tournamentData.players[tournamentData.bracketPositions.first]?.name || null
            : null,
          second: tournamentData.bracketPositions.second
            ? tournamentData.players[tournamentData.bracketPositions.second]?.name || null
            : null,
          third: tournamentData.bracketPositions.third
            ? tournamentData.players[tournamentData.bracketPositions.third]?.name || null
            : null,
          fourth: tournamentData.bracketPositions.fourth
            ? tournamentData.players[tournamentData.bracketPositions.fourth]?.name || null
            : null,
          fifth1: tournamentData.bracketPositions.fifth1
            ? tournamentData.players[tournamentData.bracketPositions.fifth1]?.name || null
            : null,
          fifth2: tournamentData.bracketPositions.fifth2
            ? tournamentData.players[tournamentData.bracketPositions.fifth2]?.name || null
            : null,
          fifth3: tournamentData.bracketPositions.fifth3
            ? tournamentData.players[tournamentData.bracketPositions.fifth3]?.name || null
            : null,
          fifth4: tournamentData.bracketPositions.fifth4
            ? tournamentData.players[tournamentData.bracketPositions.fifth4]?.name || null
            : null,
        }
      : undefined;

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
    bracketPositions: resolvedBracketPositions,
    eventDateRange: tournamentData.eventDateRange,
  };
}

/**
 * Get players organized by column (for Top 16)
 * Uses index-based slicing from player array:
 * - Players 0-3: Winners Column 1
 * - Players 4-7: Winners Column 2
 * - Players 8-11: Losers Column 1 (top)
 * - Players 12-15: Losers Column 2 (bottom)
 */
export function getPlayersByColumn(data: GraphicData) {
  const players = data.players;

  const winnersCol1 = players.slice(0, 4);
  const winnersCol2 = players.slice(4, 8);
  const losers = players.slice(8, 16);

  return { winnersCol1, winnersCol2, losers };
}

/**
 * Get players organized into 4 columns for Top 64 graphics
 * Uses index-based slicing. Each bracket (Winners/Losers) has 32 players.
 * Each column is split into top (a) and bottom (b) blocks of 4 players each.
 *
 * For a 32-player array (single bracket):
 * - col1a: Players 0-3
 * - col1b: Players 4-7
 * - col2a: Players 8-11
 * - col2b: Players 12-15
 * - col3a: Players 16-19
 * - col3b: Players 20-23
 * - col4a: Players 24-27
 * - col4b: Players 28-31
 */
export function getPlayersByColumn64(players: GraphicPlayer[]) {
  const col1a = players.slice(0, 4);
  const col1b = players.slice(4, 8);
  const col2a = players.slice(8, 12);
  const col2b = players.slice(12, 16);
  const col3a = players.slice(16, 20);
  const col3b = players.slice(20, 24);
  const col4a = players.slice(24, 28);
  const col4b = players.slice(28, 32);

  return { col1a, col1b, col2a, col2b, col3a, col3b, col4a, col4b };
}

/**
 * Split GraphicData for Top 64 into Winners and Losers data
 * Uses index-based slicing:
 * - Players 0-31: Winners bracket
 * - Players 32-63: Losers bracket
 * Usage stats are COMBINED across all 64 players and shown on both graphics
 */
export function splitGraphicDataFor64(data: GraphicData): {
  winnersData: GraphicData;
  losersData: GraphicData;
} {
  const winnersPlayers = data.players.slice(0, 32);
  const losersPlayers = data.players.slice(32, 64);

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
