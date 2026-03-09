/**
 * PlayLATAM Import Utility
 *
 * Fetches and parses team data from teamlist.playlatam.net URLs.
 * Parses Pokemon names from HTML and handles Shadow designations.
 */

import { searchPokemon } from "./pokemon-data";
import type { Pokemon } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface PlayLATAMPokemon {
  name: string; // Pokemon display name
  isShadow: boolean;
  cp?: number;
}

export interface PlayLATAMTeamData {
  playerName: string;
  pokemon: PlayLATAMPokemon[];
}

export interface PlayLATAMImportResult {
  success: boolean;
  data?: PlayLATAMTeamData;
  error?: string;
}

export interface PlayLATAMFormData {
  name: string;
  team: Pokemon[];
}

// ============================================================================
// URL Validation
// ============================================================================

/**
 * Validate and extract path from PlayLATAM URL
 * Expected format: https://teamlist.playlatam.net/t/{event}/{token}
 */
export function parsePlayLATAMUrl(url: string): { valid: boolean; path?: string; error?: string } {
  try {
    const parsed = new URL(url);

    if (parsed.hostname !== "teamlist.playlatam.net") {
      return { valid: false, error: "URL must be from teamlist.playlatam.net" };
    }

    if (!parsed.pathname.startsWith("/t/")) {
      return { valid: false, error: "URL must be a team list link (/t/...)" };
    }

    // Extract the path after /t/
    const path = parsed.pathname.slice(3); // Remove "/t/"
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
 * Convert PlayLATAM Pokemon name to speciesId format
 * Examples:
 * - "Marowak" -> "marowak"
 * - "Galarian Moltres" -> "moltres_galarian"
 * - "Alolan Ninetales" -> "ninetales_alolan"
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

  // Check for form suffixes like "(Galarian Form)", "(Galarian)", "(Forma de Galar)", etc.
  const formSuffixMatch = cleanName.match(/^(.+?)\s*\((.+?)(?:\s+Form(?:a)?)?(?:\s+de\s+\w+)?\)$/i);
  if (formSuffixMatch) {
    cleanName = formSuffixMatch[1].trim();
    const suffixForm = formSuffixMatch[2].toLowerCase()
      .replace(" form", "")
      .replace(" forma", "")
      .replace(" de ", "")
      .trim();

    // Map regional names to standard form names
    const formMap: Record<string, string> = {
      "galar": "galarian",
      "galarian": "galarian",
      "alola": "alolan",
      "alolan": "alolan",
      "hisui": "hisuian",
      "hisuian": "hisuian",
      "paldea": "paldean",
      "paldean": "paldean",
    };

    const mappedForm = formMap[suffixForm];
    if (mappedForm) {
      form = mappedForm;
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
 * Convert PlayLATAM team data to form-compatible data
 */
export async function convertPlayLATAMToFormData(
  playlatamData: PlayLATAMTeamData
): Promise<{ data: PlayLATAMFormData; errors: string[] }> {
  const errors: string[] = [];
  const team: Pokemon[] = [];

  for (const poke of playlatamData.pokemon) {
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
      name: playlatamData.playerName,
      team: team.slice(0, 6),
    },
    errors,
  };
}
