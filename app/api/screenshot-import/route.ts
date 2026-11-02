import { NextRequest, NextResponse } from "next/server";
import { getNameIndex, matchNames } from "@/lib/dracoviz-names";
import type { RecognizedTeam } from "@/lib/screenshot-import";

// The recognizer does the heavy lifting (grid search, image model, OCR) and can take
// ~15 s on a cold start.
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Forwards an uploaded screenshot to the team recognizer service. The service URL and
 * token stay server-side (RECOGNIZER_URL, RECOGNIZER_TOKEN).
 */
export async function POST(request: NextRequest) {
  const recognizerUrl = process.env.RECOGNIZER_URL;
  if (!recognizerUrl) {
    return NextResponse.json(
      { success: false, error: "Screenshot import is not configured (RECOGNIZER_URL is not set)" },
      { status: 500 }
    );
  }

  // Load (or reuse) the name list while the recognizer works.
  const namesPromise = getNameIndex();

  try {
    const form = await request.formData();
    const image = form.get("image");
    if (!(image instanceof Blob)) {
      return NextResponse.json({ success: false, error: "An image is required" }, { status: 400 });
    }
    if (image.size > MAX_BYTES) {
      return NextResponse.json({ success: false, error: "Image is too large" }, { status: 413 });
    }

    const upstream = new FormData();
    upstream.append("image", image, "screenshot.jpg");
    const token = process.env.RECOGNIZER_TOKEN;
    const response = await fetch(`${recognizerUrl.replace(/\/$/, "")}/recognize`, {
      method: "POST",
      body: upstream,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("Recognizer error:", response.status, detail);
      return NextResponse.json(
        { success: false, error: `Recognizer failed (${response.status})` },
        { status: 502 }
      );
    }

    const result = (await response.json()) as { teams: RecognizedTeam[] };
    await namesPromise;
    // Swap in the closest Dracoviz player names, keeping what was read.
    const matched = await matchNames(result.teams.map((team) => team.player));
    const teams = result.teams.map((team, i) => ({ ...team, player: matched[i], playerRead: team.player }));
    return NextResponse.json({ success: true, data: { ...result, teams } });
  } catch (error) {
    console.error("Screenshot import error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
