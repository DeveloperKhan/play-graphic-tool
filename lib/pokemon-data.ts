import type { PokemonMetadata } from "./types";

// Cache for Pokemon data
let pokemonCache: Map<string, PokemonMetadata> | null = null;
let pokemonList: PokemonMetadata[] | null = null;

/**
 * Fetch Pokemon data from dracoviz.com API
 */
async function fetchPokemonData(): Promise<Map<string, PokemonMetadata>> {
  if (pokemonCache) {
    return pokemonCache;
  }

  try {
    const response = await fetch("https://www.dracoviz.com/pokemon.json");
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokemon data: ${response.statusText}`);
    }

    const data = await response.json();
    const cache = new Map<string, PokemonMetadata>();

    // Parse the Pokemon data - only extract what we need
    Object.entries(data).forEach(([key, value]: [string, any]) => {
      const pokemon: PokemonMetadata = {
        speciesName: value.speciesName,
        speciesId: value.speciesId,
        sid: value.sid,
      };
      // Use speciesId as the key for consistent lookup
      cache.set(value.speciesId, pokemon);
    });

    pokemonCache = cache;
    return cache;
  } catch (error) {
    console.error("Error fetching Pokemon data:", error);
    throw error;
  }
}

/**
 * Get all Pokemon as an array (sorted by species name)
 */
export async function getAllPokemon(): Promise<PokemonMetadata[]> {
  if (pokemonList) {
    return pokemonList;
  }

  const cache = await fetchPokemonData();
  pokemonList = Array.from(cache.values()).sort((a, b) =>
    a.speciesName.localeCompare(b.speciesName)
  );
  return pokemonList;
}

/**
 * Get a single Pokemon by species ID
 */
export async function getPokemonById(
  id: string
): Promise<PokemonMetadata | null> {
  if (!id) return null;

  const cache = await fetchPokemonData();
  return cache.get(id) || null;
}

/**
 * Get a single Pokemon by species name (case-insensitive)
 */
export async function getPokemonByName(
  name: string
): Promise<PokemonMetadata | null> {
  if (!name) return null;

  const cache = await fetchPokemonData();
  const normalizedName = name.toLowerCase().trim();

  // Search by speciesName
  for (const pokemon of cache.values()) {
    if (pokemon.speciesName.toLowerCase() === normalizedName) {
      return pokemon;
    }
  }

  return null;
}

/**
 * Search Pokemon by query string (fuzzy search)
 * Returns results sorted by relevance
 */
export async function searchPokemon(
  query: string,
  limit: number = 20
): Promise<PokemonMetadata[]> {
  if (!query || query.trim().length === 0) {
    // Return first 20 Pokemon if no query
    const all = await getAllPokemon();
    return all.slice(0, limit);
  }

  const cache = await fetchPokemonData();
  const normalizedQuery = query.toLowerCase().trim();
  const results: Array<{ pokemon: PokemonMetadata; score: number }> = [];

  for (const pokemon of cache.values()) {
    const name = pokemon.speciesName.toLowerCase();
    const id = pokemon.speciesId.toLowerCase();

    let score = 0;

    // Exact match (highest priority)
    if (name === normalizedQuery || id === normalizedQuery) {
      score = 1000;
    }
    // Starts with query (high priority)
    else if (name.startsWith(normalizedQuery) || id.startsWith(normalizedQuery)) {
      score = 100;
    }
    // Contains query (medium priority)
    else if (name.includes(normalizedQuery) || id.includes(normalizedQuery)) {
      score = 10;
    }

    if (score > 0) {
      results.push({ pokemon, score });
    }
  }

  // Sort by score (descending), then alphabetically
  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.pokemon.speciesName.localeCompare(b.pokemon.speciesName);
  });

  return results.slice(0, limit).map((r) => r.pokemon);
}

/**
 * Get the sprite URL for a Pokemon by ID
 * @param id - Pokemon species ID
 * @param isShadow - Whether this is a shadow Pokemon (used for CSS styling)
 * @returns The sprite URL from CloudFront
 */
export async function getPokemonSprite(
  id: string,
  isShadow: boolean = false
): Promise<string> {
  if (!id) {
    return ""; // Return empty string for missing Pokemon
  }

  try {
    const pokemon = await getPokemonById(id);
    if (!pokemon) {
      return "";
    }

    return getPokemonSpriteBySid(pokemon.sid);
  } catch (error) {
    console.error(`Error getting sprite for ${id}:`, error);
    return "";
  }
}

/**
 * Get Pokemon sprite URL by sprite ID (SID)
 * Use this for direct sprite access when you already have the SID
 */
export function getPokemonSpriteBySid(sid: number): string {
  return `https://imagedelivery.net/2qzpDFW7Yl3NqBaOSqBaOSqtWxQ/home_${sid}.png/public`;
}

/**
 * Preload Pokemon data (call this on app initialization)
 */
export async function preloadPokemonData(): Promise<void> {
  await fetchPokemonData();
}
