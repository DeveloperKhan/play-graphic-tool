/**
 * Graphic data utilities for parsing CSV and preparing graphic data
 */

import type { BracketSide, BracketGroup, UsageStats, TournamentData, ColumnId, ColumnWrapperConfig, BracketLabels, OverviewType } from "./types";

export interface GraphicPlayer {
  name: string;
  bracketSide: BracketSide;
  group: BracketGroup;
  flags: string[];
  team: Array<{
    name: string;
    speciesId: string;
    isShadow: boolean;
  }>;
}

export interface GraphicData {
  eventName: string;
  eventYear: string;
  eventType: "Regional" | "International" | "Worlds" | "Generic";
  overviewType: OverviewType;
  players: GraphicPlayer[];
  usageStats: UsageStats[];
  columnWrappers?: Record<ColumnId, ColumnWrapperConfig>;
  bracketLabels?: BracketLabels;
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

      return {
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
    })
    .filter((p): p is GraphicPlayer => p !== null);

  return {
    eventName: tournamentData.eventName,
    eventYear: tournamentData.eventYear,
    eventType: tournamentData.eventType,
    overviewType: tournamentData.overviewType,
    players: graphicPlayers,
    usageStats: calculateUsageStats(graphicPlayers, 12),
    columnWrappers: tournamentData.columnWrappers,
    bracketLabels: tournamentData.bracketLabels,
  };
}

/**
 * Get players organized by bracket side and column
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
