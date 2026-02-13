/**
 * RK9 Import Utility
 *
 * Fetches and parses team data from rk9.gg teamlist URLs.
 * Handles Pokemon forms (Galarian, Alolan, etc.) and Shadow designations.
 */

import { searchPokemon } from "./pokemon-data";
import type { Pokemon } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface RK9Pokemon {
  name: string; // Display name (e.g., "Marowak", "Galarian Moltres")
  isShadow: boolean;
  cp?: number;
  fastMove?: string;
  chargedMoves?: string[];
}

export interface RK9TeamData {
  playerName: string;
  eventName: string;
  pokemon: RK9Pokemon[];
}

export interface RK9ImportResult {
  success: boolean;
  data?: RK9TeamData;
  error?: string;
}

export interface RK9FormData {
  name: string;
  team: Pokemon[];
}

// ============================================================================
// URL Validation
// ============================================================================

/**
 * Validate and extract token from RK9 URL
 * Expected format: https://rk9.gg/teamlist-go/public/{token}
 * or: https://rk9.gg/teamlist-go/public/{token1}/{token2}
 */
export function parseRK9Url(url: string): { valid: boolean; path?: string; error?: string } {
  try {
    const parsed = new URL(url);

    if (parsed.hostname !== "rk9.gg") {
      return { valid: false, error: "URL must be from rk9.gg" };
    }

    if (!parsed.pathname.startsWith("/teamlist-go/public/")) {
      return { valid: false, error: "URL must be a teamlist-go public link" };
    }

    // Extract the path after /teamlist-go/public/
    const path = parsed.pathname.replace("/teamlist-go/public/", "");
    if (!path) {
      return { valid: false, error: "Missing team token in URL" };
    }

    return { valid: true, path };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

// ============================================================================
// Pokemon Name Parsing
// ============================================================================

/**
 * Convert RK9 Pokemon name to speciesId format
 * Examples:
 * - "Marowak" -> "marowak"
 * - "Galarian Moltres" -> "moltres_galarian"
 * - "Alolan Ninetales" -> "ninetales_alolan"
 * - "Shadow Marowak" -> "marowak" (shadow is separate)
 */
function convertToSpeciesId(name: string): { speciesId: string; isShadow: boolean } {
  let cleanName = name.trim();
  let isShadow = false;

  // Check for Shadow prefix
  if (cleanName.toLowerCase().startsWith("shadow ")) {
    isShadow = true;
    cleanName = cleanName.slice(7).trim();
  }

  // Check for form prefixes (Galarian, Alolan, Hisuian, Paldean)
  const formPrefixes = ["galarian", "alolan", "hisuian", "paldean"];
  let form = "";

  for (const prefix of formPrefixes) {
    if (cleanName.toLowerCase().startsWith(prefix + " ")) {
      form = prefix;
      cleanName = cleanName.slice(prefix.length + 1).trim();
      break;
    }
  }

  // Check for form suffixes like "(Galarian Form)", "(Galarian)", etc.
  const formSuffixMatch = cleanName.match(/^(.+?)\s*\((.+?)(?:\s+Form)?\)$/i);
  if (formSuffixMatch) {
    cleanName = formSuffixMatch[1].trim();
    const suffixForm = formSuffixMatch[2].toLowerCase().replace(" form", "").trim();
    if (formPrefixes.includes(suffixForm)) {
      form = suffixForm;
    }
  }

  // Build speciesId
  let speciesId = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (form) {
    speciesId = `${speciesId}_${form}`;
  }

  return { speciesId, isShadow };
}

/**
 * Resolve a Pokemon name to a valid speciesId using search
 */
async function resolvePokemonId(name: string): Promise<string> {
  if (!name) return "";

  const { speciesId } = convertToSpeciesId(name);

  // Try direct search
  const results = await searchPokemon(speciesId, 5);
  if (results.length > 0) {
    // Check for exact match first
    const exactMatch = results.find(
      (r) => r.speciesId.toLowerCase() === speciesId.toLowerCase()
    );
    if (exactMatch) {
      return exactMatch.speciesId;
    }
    // Return best match
    return results[0].speciesId;
  }

  // Try without form suffix as fallback
  const baseName = speciesId.split("_")[0];
  const baseResults = await searchPokemon(baseName, 5);
  if (baseResults.length > 0) {
    return baseResults[0].speciesId;
  }

  return "";
}

// ============================================================================
// Data Conversion
// ============================================================================

/**
 * Convert RK9 team data to form-compatible data
 */
export async function convertRK9ToFormData(
  rk9Data: RK9TeamData
): Promise<{ data: RK9FormData; errors: string[] }> {
  const errors: string[] = [];
  const team: Pokemon[] = [];

  for (const poke of rk9Data.pokemon) {
    const { isShadow } = convertToSpeciesId(poke.name);
    const speciesId = await resolvePokemonId(poke.name);

    if (!speciesId && poke.name) {
      errors.push(`Could not find Pokemon "${poke.name}"`);
    }

    team.push({
      id: speciesId,
      isShadow: poke.isShadow || isShadow,
    });
  }

  // Ensure team has exactly 6 Pokemon
  while (team.length < 6) {
    team.push({ id: "", isShadow: false });
  }

  return {
    data: {
      name: rk9Data.playerName,
      team: team.slice(0, 6),
    },
    errors,
  };
}
