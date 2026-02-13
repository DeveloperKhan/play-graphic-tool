import { NextRequest, NextResponse } from "next/server";

export interface RosterPlayer {
  firstName: string;
  lastName: string;
  screenName: string;
  country: string; // ISO code (e.g., "UK", "IT", "US")
}

export interface RosterResult {
  success: boolean;
  players?: RosterPlayer[];
  error?: string;
}

/**
 * Validate RK9 roster URL
 * Expected format: https://rk9.gg/roster/{token}
 */
function parseRosterUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    if (parsed.hostname !== "rk9.gg") {
      return { valid: false, error: "URL must be from rk9.gg" };
    }

    if (!parsed.pathname.startsWith("/roster/")) {
      return { valid: false, error: "URL must be a roster link (e.g., rk9.gg/roster/...)" };
    }

    const token = parsed.pathname.replace("/roster/", "");
    if (!token) {
      return { valid: false, error: "Missing roster token in URL" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Parse roster HTML to extract player data
 * Structure:
 * <tr>
 *   <td>Player ID</td>
 *   <td>First name</td>
 *   <td>Last name</td>
 *   <td>Country</td>
 *   <td>Screen name</td>
 *   <td>Team List link</td>
 * </tr>
 */
function parseRosterHtml(html: string): RosterPlayer[] {
  const players: RosterPlayer[] = [];

  // Find the table body content
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) {
    return players;
  }

  const tbody = tbodyMatch[1];

  // Match each row
  const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(tbody)) !== null) {
    const row = rowMatch[1];

    // Extract all <td> contents
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let tdMatch;

    while ((tdMatch = tdRegex.exec(row)) !== null) {
      // Clean up cell content - remove HTML tags and trim
      let content = tdMatch[1]
        .replace(/<[^>]+>/g, "") // Remove HTML tags
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();
      cells.push(content);
    }

    // Expected order: Player ID, First name, Last name, Country, Screen name, Team List
    // We need: First name (1), Last name (2), Country (3), Screen name (4)
    if (cells.length >= 5) {
      const firstName = cells[1]?.trim() || "";
      const lastName = cells[2]?.trim() || "";
      const country = cells[3]?.trim() || "";
      const screenName = cells[4]?.trim() || "";

      if (screenName || (firstName && lastName)) {
        players.push({
          firstName,
          lastName,
          screenName,
          country,
        });
      }
    }
  }

  return players;
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
    const urlValidation = parseRosterUrl(url);
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
    const players = parseRosterHtml(html);

    if (players.length === 0) {
      return NextResponse.json(
        { success: false, error: "No players found in roster" },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      players,
    });
  } catch (error) {
    console.error("RK9 roster import error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
