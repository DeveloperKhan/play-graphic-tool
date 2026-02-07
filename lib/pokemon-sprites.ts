/**
 * Pokemon sprite utilities for the graphic component
 * Uses pre-fetched Pokemon data to get sprite URLs
 */

import { getAllPokemon, getPokemonSpriteBySid } from "./pokemon-data";
import type { PokemonMetadata } from "./types";

// Cache for Pokemon name -> metadata lookup
let pokemonNameCache: Map<string, PokemonMetadata> | null = null;

// Cache for local Pokemon SVG files
let localPokemonCache: Set<string> | null = null;

/**
 * Initialize the local Pokemon SVG cache
 */
async function initLocalCache(): Promise<Set<string>> {
  if (localPokemonCache) {
    return localPokemonCache;
  }

  // Fetch the list of available local Pokemon SVGs
  try {
    const response = await fetch("/api/pokemon-list");
    if (response.ok) {
      const files: string[] = await response.json();
      localPokemonCache = new Set(
        files.map((f) => f.replace("Pokemon=", "").replace(".svg", "").toLowerCase())
      );
    } else {
      localPokemonCache = new Set();
    }
  } catch {
    localPokemonCache = new Set();
  }

  return localPokemonCache;
}

/**
 * Get local sprite path for a Pokemon name
 * Handles names like "corsola (galarian)" -> "Pokemon=Corsola (Galarian).svg"
 */
function getLocalSpritePath(name: string): string {
  // Handle parenthetical forms - keep the parentheses with proper casing
  if (name.includes("(")) {
    const match = name.match(/^(.+?)\s*\((.+?)\)$/);
    if (match) {
      const baseName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      const formName = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
      return `/assets/graphic/pokemons/Pokemon=${baseName} (${formName}).svg`;
    }
  }

  // Capitalize first letter of each word for the filename
  const formattedName = name
    .split(/[\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
  return `/assets/graphic/pokemons/Pokemon=${formattedName}.svg`;
}

/**
 * Initialize the Pokemon name cache
 */
async function initCache(): Promise<Map<string, PokemonMetadata>> {
  if (pokemonNameCache) {
    return pokemonNameCache;
  }

  const allPokemon = await getAllPokemon();
  const cache = new Map<string, PokemonMetadata>();

  for (const pokemon of allPokemon) {
    // Index by lowercase species name
    cache.set(pokemon.speciesName.toLowerCase(), pokemon);
    // Also index by species ID
    cache.set(pokemon.speciesId.toLowerCase(), pokemon);
  }

  pokemonNameCache = cache;
  return cache;
}

/**
 * Get sprite URL for a Pokemon by name or species ID
 * Handles various name formats like "Altaria", "altaria", "Moltres (Galarian)"
 * First checks for local SVG files, then falls back to API
 */
export async function getSpriteByName(name: string): Promise<string> {
  if (!name) return "";

  const normalizedName = name.toLowerCase().trim();

  // First, try to find a local SVG file
  const localCache = await initLocalCache();

  // Try direct match first (e.g., "stunfisk" or "corsola (galarian)")
  if (localCache.has(normalizedName)) {
    return getLocalSpritePath(normalizedName);
  }

  // Try converting speciesId format (e.g., "corsola_galarian") to display format (e.g., "corsola (galarian)")
  if (normalizedName.includes("_")) {
    const parts = normalizedName.split("_");
    if (parts.length === 2) {
      const displayFormat = `${parts[0]} (${parts[1]})`;
      if (localCache.has(displayFormat)) {
        return getLocalSpritePath(displayFormat);
      }
    }
  }

  // For parenthetical forms, try base name (e.g., "moltres (galarian)" -> "moltres")
  if (normalizedName.includes("(")) {
    const baseName = normalizedName.split("(")[0].trim();
    if (localCache.has(baseName)) {
      return getLocalSpritePath(baseName);
    }
  }

  // Fall back to API-based lookup
  const cache = await initCache();

  // Try direct lookup
  let pokemon = cache.get(normalizedName);

  // Try without parenthetical forms (e.g., "Galarian" -> look for base name with form)
  if (!pokemon && normalizedName.includes("(")) {
    // Convert "moltres (galarian)" to possible species IDs
    const baseName = normalizedName.split("(")[0].trim();
    const form = normalizedName.match(/\(([^)]+)\)/)?.[1]?.toLowerCase();

    if (form) {
      // Try "baseName_form" format (e.g., "moltres_galarian")
      const formattedId = `${baseName}_${form}`;
      pokemon = cache.get(formattedId);

      // Try with "galarian_" prefix
      if (!pokemon) {
        pokemon = cache.get(`${form}_${baseName}`);
      }
    }
  }

  // Try with underscores instead of spaces
  if (!pokemon) {
    pokemon = cache.get(normalizedName.replace(/\s+/g, "_"));
  }

  if (pokemon) {
    return getPokemonSpriteBySid(pokemon.sid);
  }

  // Return empty string if not found
  console.warn(`Pokemon not found: ${name}`);
  return "";
}

/**
 * Pre-load all Pokemon data to avoid async issues during render
 */
export async function preloadPokemonSprites(): Promise<void> {
  await initCache();
}

/**
 * Get Pokemon metadata by name (synchronous after cache init)
 */
export function getPokemonMetadataSync(
  name: string
): PokemonMetadata | undefined {
  if (!pokemonNameCache) {
    console.warn("Pokemon cache not initialized. Call preloadPokemonSprites first.");
    return undefined;
  }

  const normalizedName = name.toLowerCase().trim();
  return pokemonNameCache.get(normalizedName);
}
