/**
 * RK9 Import Utility
 *
 * Fetches and parses team data from rk9.gg teamlist URLs.
 * Handles Pokemon forms (Galarian, Alolan, etc.) and Shadow designations.
 */

import { searchPokemon } from "./pokemon-data";
import type { Pokemon } from "./types";

// ============================================================================
// Player Name Mappings
// ============================================================================

/**
 * Maps RK9 player names to their actual display names.
 * Used when a player's RK9 registration name differs from their preferred name.
 */
const PLAYER_NAME_MAPPINGS: Record<string, string> = {
  TzGabs: "TzSteinar",
};

/**
 * Apply player name mapping if one exists
 */
function mapPlayerName(name: string): string {
  return PLAYER_NAME_MAPPINGS[name] ?? name;
}

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
      name: mapPlayerName(rk9Data.playerName),
      team: team.slice(0, 6),
    },
    errors,
  };
}

// ============================================================================
// HTML Parsing
// ============================================================================

/**
 * Parse RK9 HTML to extract team data
 * RK9 page structure:
 * - Player name: <h3>Team list for: <b>PlayerName</b></h3>
 * - Pokemon in <div class="pokemon"> blocks:
 *   - Name at start (possibly with [Form])
 *   - <b>CP</b> value
 *   - Optional "Shadow" text after CP
 */
export function parseRK9Html(html: string): RK9TeamData | null {
  try {
    let playerName = "";
    let eventName = "";

    // Extract player name from <h3>Team list for: <b>Name</b></h3>
    const playerNameMatch = html.match(/Team\s+list\s+for:\s*<b>([^<]+)<\/b>/i);
    if (playerNameMatch) {
      playerName = playerNameMatch[1].trim();
    }

    // Fallback: Try title tag "Team list for: Name - RK9"
    if (!playerName) {
      const titleMatch = html.match(/<title>Team\s+list\s+for:\s*([^<-]+)/i);
      if (titleMatch) {
        playerName = titleMatch[1].trim();
      }
    }

    // Extract event name from the page header
    const eventMatch = html.match(/<h4[^>]*>([^<]+)<\/h4>/i);
    if (eventMatch) {
      eventName = eventMatch[1].trim();
    }

    // Parse Pokemon from <div class="pokemon"> blocks
    // Only parse English (lang-EN) section to avoid duplicates
    const pokemon: RK9Pokemon[] = [];

    // Find the English translation section
    const englishSectionMatch = html.match(/<div[^>]*class="[^"]*translation\s+lang-EN[^"]*"[^>]*>([\s\S]*?)(?:<div[^>]*class="[^"]*translation\s+lang-|<\/div>\s*<\/div>\s*<\/div>)/i);
    const sectionHtml = englishSectionMatch ? englishSectionMatch[1] : html;

    // Match each pokemon div block
    const pokemonDivRegex = /<div[^>]*class="[^"]*pokemon[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let divMatch;

    while ((divMatch = pokemonDivRegex.exec(sectionHtml)) !== null && pokemon.length < 6) {
      const block = divMatch[1];

      // Extract Pokemon name - it's the first text content before <br>
      // Format: "Azumarill" or "Moltres [Galarian Form]"
      const nameMatch = block.match(/^\s*([A-Za-z][A-Za-z'\-\s]*?)(?:\s*\[([^\]]+)\])?\s*<br/i);
      if (!nameMatch) continue;

      let baseName = nameMatch[1].trim();
      const formVariant = nameMatch[2] || "";

      // Check if Shadow appears after CP line
      const isShadow = /(?:<b>(?:CP|PC|PL|WP)<\/b>\s*\d+\s*<br>\s*(?:Shadow|Obscur|Ombra|Crypto|Oscuro))/i.test(block);

      // Build full name with form
      let fullName = baseName;
      if (formVariant) {
        // Extract form type from "[Galarian Form]", "[Forma de Galar]", etc.
        const formMatch = formVariant.match(/(Galarian|Alolan|Hisuian|Paldean|Galar|Alola|Hisui|Paldea)/i);
        if (formMatch) {
          const formType = formMatch[1].toLowerCase();
          // Normalize short form names to full form names
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
          const normalizedForm = formMap[formType] || formType;
          fullName = `${normalizedForm} ${baseName}`;
        }
      }

      pokemon.push({
        name: fullName,
        isShadow,
      });
    }

    if (!playerName && pokemon.length === 0) {
      return null;
    }

    return {
      playerName: playerName || "Unknown Player",
      eventName,
      pokemon: pokemon.slice(0, 6),
    };
  } catch (error) {
    console.error("Error parsing RK9 HTML:", error);
    return null;
  }
}
