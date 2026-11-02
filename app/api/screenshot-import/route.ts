import { NextRequest, NextResponse } from "next/server";
import { buildNameIndex, matchPlayerName, type NameIndex } from "@/lib/name-match";
import type { RecognizedTeam } from "@/lib/screenshot-import";

// The recognizer does the heavy lifting (grid search, image model, OCR) and can take
// ~15 s on a cold start.
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;

const DRACOVIZ_API_URL = process.env.DRACOVIZ_API_URL || "https://dracoviz.com";
const NAMES_TTL_MS = 60 * 60 * 1000;
let namesCache: { index: NameIndex; fetchedAt: number } | null = null;

/**
 * Every player name Dracoviz has a profile for (the `names` collection), indexed for
 * matching. Cached per instance for an hour; null when no key is configured or the
 * request fails, in which case names are returned as OCR read them.
 */
async function getNameIndex(): Promise<NameIndex | null> {
  const key = process.env.DRACOVIZ_API_KEY;
  if (!key) return null;
  if (namesCache && Date.now() - namesCache.fetchedAt < NAMES_TTL_MS) return namesCache.index;
  try {
    const response = await fetch(`${DRACOVIZ_API_URL}/api/tournament?searchType=profile&name=`, {
      headers: { x_authorization: `Basic ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Dracoviz API returned ${response.status}`);
    const { allProfiles } = (await response.json()) as { allProfiles?: string[] };
    if (!Array.isArray(allProfiles)) throw new Error("No profile names in response");
    namesCache = { index: buildNameIndex(allProfiles), fetchedAt: Date.now() };
    return namesCache.index;
  } catch (error) {
    console.error("Could not load Dracoviz player names:", error);
    return namesCache?.index ?? null;
  }
}

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

    const [result, names] = await Promise.all([
      response.json() as Promise<{ teams: RecognizedTeam[] }>,
      namesPromise,
    ]);
    // The overlay prints names in capitals and OCR confuses O/0, I/1 and the like:
    // swap in the closest Dracoviz player name, keeping what was read.
    const teams = result.teams.map((team) => {
      const read = team.player;
      const matched = read && names ? matchPlayerName(read, names) : null;
      return { ...team, player: matched ?? read, playerRead: read };
    });
    return NextResponse.json({ success: true, data: { ...result, teams } });
  } catch (error) {
    console.error("Screenshot import error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
