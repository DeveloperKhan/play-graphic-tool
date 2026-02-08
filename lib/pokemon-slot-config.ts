/**
 * Pokemon Slot Sorting Configuration
 *
 * This file defines the type preferences for each team slot.
 * The algorithm will try to place Pokemon based on these preferences.
 *
 * Each slot has:
 * - preferredTypes: Array of types in priority order (first = highest priority)
 * - description: Human-readable description of the slot's purpose
 *
 * The algorithm:
 * 1. For each slot, find Pokemon matching the preferred types (in priority order)
 * 2. If a Pokemon matches multiple slots, assign to highest priority slot
 * 3. Place duplicate type Pokemon in later slots (preferably slot 6)
 * 4. Remaining Pokemon fill empty slots
 */

export interface SlotConfig {
  preferredTypes: string[];
  description: string;
}

export interface TeamSlotConfig {
  slots: SlotConfig[];
  duplicateSlot: number; // Preferred slot for duplicate type Pokemon (0-indexed)
}

/**
 * Default slot configuration based on current meta
 * Update this as the meta shifts
 */
export const defaultSlotConfig: TeamSlotConfig = {
  slots: [
    {
      // Slot 1: Ground/Grass types - usually bulky ground types like Stunfisk, Gastrodon
      preferredTypes: ["ground", "grass"],
      description: "Ground or Grass type (priority: Ground)",
    },
    {
      // Slot 2: Steel/Poison types - defensive cores like Bastiodon, Registeel
      preferredTypes: ["steel", "poison"],
      description: "Steel or Poison type (priority: Steel)",
    },
    {
      // Slot 3: Dragon/Flying/Normal/Bug - versatile attackers
      preferredTypes: ["dragon", "flying", "normal", "bug"],
      description: "Dragon, Flying, Normal, or Bug type (priority: Dragon)",
    },
    {
      // Slot 4: Flying/Fairy/Psychic - special attackers and support
      preferredTypes: ["flying", "fairy", "psychic"],
      description: "Flying, Fairy, or Psychic type (priority: Flying)",
    },
    {
      // Slot 5: Flexible - any remaining types
      preferredTypes: [],
      description: "Flexible slot for remaining Pokemon",
    },
    {
      // Slot 6: Duplicate types - Pokemon sharing types with others
      preferredTypes: [],
      description: "Preferred slot for duplicate type Pokemon",
    },
  ],
  duplicateSlot: 5, // Slot 6 (0-indexed as 5)
};

/**
 * Get the slot config (can be extended to load from localStorage/API)
 */
export function getSlotConfig(): TeamSlotConfig {
  return defaultSlotConfig;
}
