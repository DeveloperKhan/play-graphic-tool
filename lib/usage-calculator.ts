import type { Player, UsageStats } from "./types";

/**
 * Calculate Pokemon usage statistics from player teams
 * @param players - Record of players
 * @returns Array of usage stats sorted by total count (descending)
 */
export function calculateUsageStats(
  players: Record<string, Player>
): UsageStats[] {
  const usageMap = new Map<
    string,
    { count: number; shadowCount: number }
  >();

  // Count Pokemon occurrences across all player teams
  Object.values(players).forEach((player) => {
    player.team.forEach((pokemon) => {
      if (!pokemon.id) return; // Skip empty Pokemon slots

      const current = usageMap.get(pokemon.id) || {
        count: 0,
        shadowCount: 0,
      };

      current.count += 1;
      if (pokemon.isShadow) {
        current.shadowCount += 1;
      }

      usageMap.set(pokemon.id, current);
    });
  });

  // Convert to array and sort by total count
  const usageStats: UsageStats[] = Array.from(usageMap.entries()).map(
    ([pokemon, stats]) => ({
      pokemon,
      count: stats.count,
      shadowCount: stats.shadowCount,
    })
  );

  // Sort by count descending
  usageStats.sort((a, b) => b.count - a.count);

  return usageStats;
}

/**
 * Get the top N most used Pokemon
 * @param players - Record of players
 * @param topN - Number of top Pokemon to return (default 12)
 * @returns Array of top N usage stats
 */
export function getTopUsage(
  players: Record<string, Player>,
  topN: number = 12
): UsageStats[] {
  const allStats = calculateUsageStats(players);
  return allStats.slice(0, topN);
}

/**
 * Calculate usage percentage for a Pokemon
 * @param count - Number of times Pokemon was used
 * @param totalPlayers - Total number of players in tournament
 * @returns Percentage (0-100)
 */
export function calculateUsagePercentage(
  count: number,
  totalPlayers: number
): number {
  if (totalPlayers === 0) return 0;
  // Each player has 6 Pokemon, so max possible is totalPlayers * 6
  // But we typically show percentage of players who used it
  return (count / totalPlayers) * 100;
}
