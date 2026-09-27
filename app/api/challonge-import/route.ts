import { NextRequest, NextResponse } from "next/server";
import {
  parseChallongeUrl,
  computeStandings,
  type ChallongeParticipant,
  type ChallongeMatch,
  type ChallongeTournament,
} from "@/lib/challonge";

const CHALLONGE_API_BASE = "https://api.challonge.com/v1";

/**
 * Fetch a Challonge v1 endpoint and unwrap its envelope.
 * The v1 API wraps every object: tournaments return `{ tournament: {...} }`,
 * collections return `[{ participant: {...} }, ...]`.
 */
async function fetchChallonge<T>(
  path: string,
  apiKey: string
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const url = `${CHALLONGE_API_BASE}${path}.json?api_key=${encodeURIComponent(apiKey)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 502, error: "Could not reach the Challonge API" };
  }

  if (response.status === 401) {
    return { ok: false, status: 401, error: "Challonge rejected the API key" };
  }

  if (response.status === 404) {
    return {
      ok: false,
      status: 404,
      error: "Tournament not found. Check the URL, and that the API key's account can see it.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: 502,
      error: `Challonge API returned ${response.status}`,
    };
  }

  try {
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, status: 502, error: "Challonge returned malformed JSON" };
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

    const apiKey = process.env.CHALLONGE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Challonge API key not configured. Set CHALLONGE_API_KEY in .env.local (or the Vercel project environment) and restart the server.",
        },
        { status: 503 }
      );
    }

    const urlValidation = parseChallongeUrl(url);
    if (!urlValidation.valid || !urlValidation.tournamentId) {
      return NextResponse.json(
        { success: false, error: urlValidation.error },
        { status: 400 }
      );
    }

    const id = encodeURIComponent(urlValidation.tournamentId);

    const [tournamentResult, participantsResult, matchesResult] = await Promise.all([
      fetchChallonge<{ tournament: ChallongeTournament }>(`/tournaments/${id}`, apiKey),
      fetchChallonge<Array<{ participant: ChallongeParticipant }>>(
        `/tournaments/${id}/participants`,
        apiKey
      ),
      fetchChallonge<Array<{ match: ChallongeMatch }>>(
        `/tournaments/${id}/matches`,
        apiKey
      ),
    ]);

    for (const result of [tournamentResult, participantsResult, matchesResult]) {
      if (!result.ok) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: result.status }
        );
      }
    }

    // Narrowed by the loop above, but TypeScript needs the explicit checks
    if (!tournamentResult.ok || !participantsResult.ok || !matchesResult.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to load tournament" },
        { status: 502 }
      );
    }

    const tournament = tournamentResult.data.tournament;
    const participants = participantsResult.data.map((p) => p.participant);
    const matches = matchesResult.data.map((m) => m.match);

    if (participants.length === 0) {
      return NextResponse.json(
        { success: false, error: "Tournament has no participants" },
        { status: 422 }
      );
    }

    const standings = computeStandings(participants, matches);

    if (standings.entries.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not determine any standings or pairings from this tournament",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      mode: standings.mode,
      rankedCount: standings.rankedCount,
      fullFieldRanked: standings.fullFieldRanked,
      entries: standings.entries,
      tournament: {
        name: tournament.name,
        state: tournament.state,
        startedAt: tournament.started_at,
        completedAt: tournament.completed_at,
      },
    });
  } catch (error) {
    console.error("Challonge import error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
