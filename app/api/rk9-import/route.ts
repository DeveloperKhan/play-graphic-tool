import { NextRequest, NextResponse } from "next/server";
import { parseRK9Url, type RK9TeamData, type RK9Pokemon } from "@/lib/rk9-import";

/**
 * Parse RK9 HTML to extract team data
 * RK9 page structure:
 * - Player name: <h3>Team list for: <b>PlayerName</b></h3>
 * - Pokemon in <div class="pokemon"> blocks:
 *   - Name at start (possibly with [Form])
 *   - <b>CP</b> value
 *   - Optional "Shadow" text after CP
 */
function parseRK9Html(html: string): RK9TeamData | null {
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
    const urlValidation = parseRK9Url(url);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { success: false, error: urlValidation.error },
        { status: 400 }
      );
    }

    // Fetch the page
    const response = await fetch(url, {
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
    const teamData = parseRK9Html(html);

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
    console.error("RK9 import error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
