import { NextRequest, NextResponse } from "next/server";

const DRACOVIZ_API_URL =
  process.env.DRACOVIZ_API_URL || "https://dracoviz.com";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { players } = body;

    if (!Array.isArray(players) || players.length === 0) {
      return NextResponse.json(
        { success: false, error: "players array is required" },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${DRACOVIZ_API_URL}/api/player-flags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: players }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: `Dracoviz API returned ${response.status}` },
          { status: 502 }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (fetchError: unknown) {
      clearTimeout(timeout);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return NextResponse.json(
          { success: false, error: "Dracoviz API timeout" },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("Dracoviz flags proxy error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch flags from Dracoviz" },
      { status: 500 }
    );
  }
}
