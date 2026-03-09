import { NextRequest, NextResponse } from "next/server";
import { parsePlayLATAMUrl, type PlayLATAMTeamData, type PlayLATAMPokemon } from "@/lib/playlatam-import";

// Cache for PlayLATAM Pokemon data
let pokemonDataCache: Map<number, { nameENG: string; alternativeENG: string }> | null = null;

/**
 * Fetch and cache PlayLATAM's pokemon.js data
 */
async function fetchPlayLATAMPokemonData(): Promise<Map<number, { nameENG: string; alternativeENG: string }>> {
  if (pokemonDataCache) {
    return pokemonDataCache;
  }

  const response = await fetch("https://teamlist.playlatam.net/pogo/pokemon.js", {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TeamListImporter/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch PlayLATAM Pokemon data");
  }

  const jsContent = await response.text();

  // Parse the JavaScript array: var pokemon=[{...}, {...}, ...]
  const jsonMatch = jsContent.match(/var\s+pokemon\s*=\s*(\[[\s\S]*\]);?\s*$/);
  if (!jsonMatch) {
    throw new Error("Could not parse PlayLATAM Pokemon data");
  }

  const pokemonArray = JSON.parse(jsonMatch[1]);
  const cache = new Map<number, { nameENG: string; alternativeENG: string }>();

  for (const p of pokemonArray) {
    cache.set(p.id, {
      nameENG: p.nameENG || "",
      alternativeENG: p.alternativeENG || "",
    });
  }

  pokemonDataCache = cache;
  return cache;
}

/**
 * Parse PlayLATAM HTML to extract team data
 * Uses pokemonid from teamlist.push() calls and resolves names from pokemon.js
 */
async function parsePlayLATAMHtml(html: string): Promise<PlayLATAMTeamData | null> {
  try {
    let playerName = "";

    // Extract player name from "Equipo de [flag] PlayerName" pattern
    const playerNameMatch = html.match(/<h1>Equipo\s+de\s+(?:<[^>]*>\s*)*([^<]+)<\/h1>/i);
    if (playerNameMatch) {
      playerName = playerNameMatch[1].trim();
    }

    // Fallback: Try simpler pattern
    if (!playerName) {
      const simpleMatch = html.match(/Equipo\s+de\s+(?:<[^>]*>)*\s*([A-Za-z0-9_\-]+)/i);
      if (simpleMatch) {
        playerName = simpleMatch[1].trim();
      }
    }

    // Parse teamlist.push() calls to get Pokemon IDs and shadow status
    const teamEntries: Array<{ pokemonid: number; shadowpurified: string }> = [];
    const pushMatches = html.matchAll(/teamlist\.push\(\s*\{([^}]+)\}\s*\)/g);

    for (const match of pushMatches) {
      const content = match[1];
      const pokemonidMatch = content.match(/pokemonid:\s*(\d+)/);
      const shadowMatch = content.match(/shadowpurified:\s*["'](\w)["']/);

      if (pokemonidMatch) {
        teamEntries.push({
          pokemonid: parseInt(pokemonidMatch[1]),
          shadowpurified: shadowMatch ? shadowMatch[1] : "N",
        });
      }
    }

    // Fetch Pokemon data to resolve names
    const pokemonData = await fetchPlayLATAMPokemonData();

    // Resolve Pokemon names
    const pokemon: PlayLATAMPokemon[] = [];
    for (const entry of teamEntries) {
      const pokeData = pokemonData.get(entry.pokemonid);

      let name = "";
      if (pokeData) {
        name = pokeData.nameENG;
        // Append form info if present (e.g., "Galarian Form")
        if (pokeData.alternativeENG) {
          name = `${name} (${pokeData.alternativeENG})`;
        }
      }

      pokemon.push({
        name,
        isShadow: entry.shadowpurified === "S",
      });
    }

    if (!playerName && pokemon.length === 0) {
      return null;
    }

    return {
      playerName: playerName || "Unknown Player",
      pokemon: pokemon.slice(0, 6),
    };
  } catch (error) {
    console.error("Error parsing PlayLATAM HTML:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    const urlValidation = parsePlayLATAMUrl(url);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { success: false, error: urlValidation.error },
        { status: 400 }
      );
    }

    // Clean the URL (remove tracking parameters)
    const cleanUrl = url.split("?")[0];

    // Fetch the page
    const response = await fetch(cleanUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TeamListImporter/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch page: ${response.status}` },
        { status: 502 }
      );
    }

    const html = await response.text();

    // Parse the HTML
    const teamData = await parsePlayLATAMHtml(html);

    if (!teamData) {
      return NextResponse.json(
        { success: false, error: "Could not parse team data from page" },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: teamData,
    });
  } catch (error) {
    console.error("PlayLATAM import error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
