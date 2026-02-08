/**
 * CSV Import Utility
 *
 * Parses CSV data from tournament team exports and converts it to form data.
 * Handles Pokemon forms (Galarian, Alolan, etc.) and Shadow designations.
 *
 * Supports multiple import formats - currently:
 * - Anicor Spreadsheet: Group,Country,Name,Pokemon 1,...,Pokemon 6
 */

import { searchPokemon } from "./pokemon-data";
import type { Player, Pokemon } from "./types";

// ============================================================================
// Import Format Definitions
// ============================================================================

export type ImportFormat = "anicor";

export interface ImportFormatConfig {
  id: ImportFormat;
  name: string;
  description: string;
  exampleHeader: string;
  exampleRow: string;
}

export const IMPORT_FORMATS: ImportFormatConfig[] = [
  {
    id: "anicor",
    name: "Anicor Spreadsheet",
    description: "Group, Country, Name, Pokemon 1-6 columns",
    exampleHeader: "Group,Country,Name,Pokemon 1,Pokemon 2,Pokemon 3,Pokemon 4,Pokemon 5,Pokemon 6",
    exampleRow: "A-WF1,Argentina,MartoGalde,Azumarill,Corsola (Galarian),Corviknight,Scizor (Shadow),Guzzlord,Marowak (Shadow)",
  },
];

export function getFormatConfig(format: ImportFormat): ImportFormatConfig | undefined {
  return IMPORT_FORMATS.find((f) => f.id === format);
}

// ============================================================================
// Country Mapping
// ============================================================================

const countryToIso: Record<string, string> = {
  // Americas
  argentina: "AR",
  brazil: "BR",
  chile: "CL",
  colombia: "CO",
  "costa rica": "CR",
  ecuador: "EC",
  mexico: "MX",
  peru: "PE",
  perú: "PE",
  uruguay: "UY",
  venezuela: "VE",
  "united states": "US",
  usa: "US",
  canada: "CA",

  // Europe
  spain: "ES",
  france: "FR",
  germany: "DE",
  italy: "IT",
  "united kingdom": "GB",
  uk: "GB",
  portugal: "PT",
  netherlands: "NL",
  belgium: "BE",
  austria: "AT",
  switzerland: "CH",
  poland: "PL",
  sweden: "SE",
  norway: "NO",
  denmark: "DK",
  finland: "FI",
  ireland: "IE",
  greece: "GR",
  "czech republic": "CZ",
  czechia: "CZ",
  hungary: "HU",
  romania: "RO",

  // Asia Pacific
  japan: "JP",
  "south korea": "KR",
  korea: "KR",
  china: "CN",
  taiwan: "TW",
  "hong kong": "HK",
  singapore: "SG",
  malaysia: "MY",
  thailand: "TH",
  philippines: "PH",
  indonesia: "ID",
  vietnam: "VN",
  india: "IN",
  australia: "AU",
  "new zealand": "NZ",
};

// ============================================================================
// Shared Types
// ============================================================================

interface ParsedPokemon {
  name: string; // speciesId format (e.g., "corsola_galarian")
  isShadow: boolean;
}

interface ParsedPlayer {
  name: string;
  country: string; // ISO code
  pokemon: ParsedPokemon[];
}

export interface ImportResult {
  players: ParsedPlayer[];
  errors: string[];
}

// ============================================================================
// Shared Utilities
// ============================================================================

/**
 * Parse a Pokemon name string to extract the name and shadow status.
 * Examples:
 * - "Azumarill" -> { name: "azumarill", isShadow: false }
 * - "Scizor (Shadow)" -> { name: "scizor", isShadow: true }
 * - "Corsola (Galarian)" -> { name: "corsola_galarian", isShadow: false }
 * - "Ninetales (Alolan) (Shadow)" -> { name: "ninetales_alolan", isShadow: true }
 */
function parsePokemonName(rawName: string): ParsedPokemon {
  let name = rawName.trim();
  let isShadow = false;

  // Check for (Shadow) at the end
  if (name.toLowerCase().endsWith("(shadow)")) {
    isShadow = true;
    name = name.slice(0, -8).trim(); // Remove "(Shadow)"
  }

  // Convert display name to speciesId format
  // "Corsola (Galarian)" -> "corsola_galarian"
  // "Ninetales (Alolan)" -> "ninetales_alolan"
  const formMatch = name.match(/^(.+?)\s*\((.+?)\)$/);
  if (formMatch) {
    const baseName = formMatch[1].toLowerCase().trim();
    const form = formMatch[2].toLowerCase().trim();
    name = `${baseName}_${form}`;
  } else {
    name = name.toLowerCase().trim();
  }

  return { name, isShadow };
}

/**
 * Map a country name to ISO code
 */
function mapCountryToIso(country: string): string {
  const normalized = country.toLowerCase().trim();
  return countryToIso[normalized] || "";
}

/**
 * Simple CSV line parser that handles quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

/**
 * Resolve a parsed Pokemon name to a speciesId
 * Uses fuzzy search to find the best match
 */
async function resolvePokemonId(parsedName: string): Promise<string> {
  if (!parsedName) return "";

  // Try direct search first
  const results = await searchPokemon(parsedName, 5);
  if (results.length > 0) {
    // Check for exact match first
    const exactMatch = results.find(
      (r) => r.speciesId.toLowerCase() === parsedName.toLowerCase()
    );
    if (exactMatch) {
      return exactMatch.speciesId;
    }
    // Otherwise return best match
    return results[0].speciesId;
  }

  return "";
}

// ============================================================================
// Format-Specific Parsers
// ============================================================================

/**
 * Parse Anicor Spreadsheet format
 * Columns: Group, Country, Name, Pokemon 1, Pokemon 2, Pokemon 3, Pokemon 4, Pokemon 5, Pokemon 6
 */
function parseAnicorFormat(csvText: string): ImportResult {
  const errors: string[] = [];
  const players: ParsedPlayer[] = [];

  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    errors.push("CSV must have at least a header row and one data row");
    return { players, errors };
  }

  // Parse header to find column indices
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const countryIndex = header.findIndex((h) => h === "country");
  const nameIndex = header.findIndex((h) => h === "name");
  const pokemon1Index = header.findIndex((h) => h === "pokemon 1");

  if (nameIndex === -1) {
    errors.push("CSV must have a 'Name' column");
    return { players, errors };
  }

  if (pokemon1Index === -1) {
    errors.push("CSV must have 'Pokemon 1' through 'Pokemon 6' columns");
    return { players, errors };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = parseCSVLine(line);

    const playerName = columns[nameIndex]?.trim() || "";
    if (!playerName) {
      errors.push(`Row ${i + 1}: Missing player name`);
      continue;
    }

    const country = countryIndex !== -1 ? mapCountryToIso(columns[countryIndex] || "") : "";

    // Parse Pokemon 1-6
    const pokemon: ParsedPokemon[] = [];
    for (let j = 0; j < 6; j++) {
      const pokemonIndex = pokemon1Index + j;
      const rawPokemon = columns[pokemonIndex]?.trim() || "";
      if (rawPokemon) {
        pokemon.push(parsePokemonName(rawPokemon));
      } else {
        pokemon.push({ name: "", isShadow: false });
      }
    }

    players.push({
      name: playerName,
      country,
      pokemon,
    });
  }

  return { players, errors };
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse CSV text using the specified format
 */
export function parseTeamsCsv(csvText: string, format: ImportFormat): ImportResult {
  switch (format) {
    case "anicor":
      return parseAnicorFormat(csvText);
    default:
      return { players: [], errors: [`Unknown format: ${format}`] };
  }
}

/**
 * Convert parsed CSV data to form-compatible player data
 */
export async function convertToFormData(
  parsed: ImportResult
): Promise<{ players: Partial<Player>[]; errors: string[] }> {
  const errors = [...parsed.errors];
  const players: Partial<Player>[] = [];

  for (let i = 0; i < parsed.players.length; i++) {
    const p = parsed.players[i];
    const team: Pokemon[] = [];

    for (let j = 0; j < p.pokemon.length; j++) {
      const poke = p.pokemon[j];
      if (poke.name) {
        const speciesId = await resolvePokemonId(poke.name);
        if (!speciesId) {
          errors.push(`Player "${p.name}": Could not find Pokemon "${poke.name}"`);
        }
        team.push({ id: speciesId, isShadow: poke.isShadow });
      } else {
        team.push({ id: "", isShadow: false });
      }
    }

    // Ensure team has exactly 6 Pokemon
    while (team.length < 6) {
      team.push({ id: "", isShadow: false });
    }

    players.push({
      name: p.name,
      flags: p.country ? [p.country] : [],
      team,
    });
  }

  return { players, errors };
}
