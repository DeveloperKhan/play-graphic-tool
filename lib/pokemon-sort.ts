/**
 * Pokemon Sorting Algorithm
 *
 * Reorders a team of 6 Pokemon based on type preferences.
 * Uses the configuration from pokemon-slot-config.ts.
 *
 * This is a general ordering sort - it prioritizes Pokemon by their types
 * according to the slot preferences, but doesn't strictly enforce slots.
 */

import { getSlotConfig } from "./pokemon-slot-config";
import { getPokemonById } from "./pokemon-data";
import type { Pokemon, PokemonMetadata } from "./types";

interface PokemonWithScore {
  pokemon: Pokemon;
  metadata: PokemonMetadata | null;
  sortScore: number;
  usageCount: number;
}

/**
 * Calculate a sort score for a Pokemon based on type preferences.
 * Lower score = higher priority (should appear earlier in the team).
 *
 * Scoring:
 * - Pokemon matching slot 1 types get scores 0-99
 * - Pokemon matching slot 2 types get scores 100-199
 * - Pokemon matching slot 3 types get scores 200-299
 * - Pokemon matching slot 4 types get scores 300-399
 * - Pokemon with no type matches get score 1000
 */
function calculateSortScore(metadata: PokemonMetadata | null): number {
  if (!metadata || metadata.types.length === 0) {
    return 1000; // No metadata = sort last
  }

  const config = getSlotConfig();
  const pokemonTypes = metadata.types.map((t) => t.toLowerCase());

  // Check each slot's preferred types and find the best match
  for (let slotIndex = 0; slotIndex < config.slots.length; slotIndex++) {
    const slotConfig = config.slots[slotIndex];
    if (slotConfig.preferredTypes.length === 0) continue;

    // Check if this Pokemon matches any of the slot's preferred types
    for (let typeIndex = 0; typeIndex < slotConfig.preferredTypes.length; typeIndex++) {
      const preferredType = slotConfig.preferredTypes[typeIndex].toLowerCase();
      if (pokemonTypes.includes(preferredType)) {
        // Score = slotIndex * 100 + typeIndex (so slot 1 ground = 0, slot 1 grass = 1, etc.)
        return slotIndex * 100 + typeIndex;
      }
    }
  }

  // No match found - sort after all matched Pokemon
  return 1000;
}

/**
 * Sort a team of Pokemon based on type preferences.
 * Simply reorders the existing Pokemon - doesn't add or remove any.
 *
 * @param team - Array of Pokemon from the form
 * @param usageCounts - Optional map of Pokemon ID to usage count across all teams
 * @returns Sorted array of the same Pokemon
 */
export async function sortTeam(
  team: Pokemon[],
  usageCounts?: Map<string, number>
): Promise<Pokemon[]> {
  // Deep clone the Pokemon to avoid reference issues with form state
  const clonedTeam: Pokemon[] = team.map((p) => ({
    id: p.id,
    isShadow: p.isShadow,
  }));

  // Fetch metadata for all Pokemon
  const pokemonWithScores: PokemonWithScore[] = await Promise.all(
    clonedTeam.map(async (pokemon) => ({
      pokemon,
      metadata: pokemon.id ? await getPokemonById(pokemon.id) : null,
      sortScore: 0, // Will be calculated below
      usageCount: pokemon.id ? (usageCounts?.get(pokemon.id) ?? 0) : 0,
    }))
  );

  // Calculate sort scores
  for (const p of pokemonWithScores) {
    p.sortScore = calculateSortScore(p.metadata);
  }

  // Sort by:
  // 1. Usage count (descending - higher usage first)
  // 2. Bucket score (ascending - lower score = earlier slot preference)
  pokemonWithScores.sort((a, b) => {
    // First sort by usage (higher usage = earlier)
    if (a.usageCount !== b.usageCount) {
      return b.usageCount - a.usageCount;
    }
    // Then sort by bucket score (lower = earlier)
    return a.sortScore - b.sortScore;
  });

  // Return the sorted Pokemon as new objects
  return pokemonWithScores.map((p) => ({
    id: p.pokemon.id,
    isShadow: p.pokemon.isShadow,
  }));
}

/**
 * Calculate usage counts for all Pokemon across all teams.
 * @param allTeams - Array of all teams (each team is an array of Pokemon)
 * @returns Map of Pokemon ID to usage count
 */
export function calculateUsageCounts(allTeams: Pokemon[][]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const team of allTeams) {
    for (const pokemon of team) {
      if (pokemon.id) {
        counts.set(pokemon.id, (counts.get(pokemon.id) ?? 0) + 1);
      }
    }
  }

  return counts;
}
