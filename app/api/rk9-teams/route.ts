import { NextRequest, NextResponse } from "next/server";
import { parseRK9Url, parseRK9Html, type RK9TeamData } from "@/lib/rk9-import";

/** Most events are a Top 8 to Top 32 cut; the cap guards against a bad payload. */
const MAX_URLS = 64;

/** RK9 serves these pages one request at a time; keep the fan-out modest. */
const CONCURRENCY = 5;

/** One retry per URL, matching the retry behaviour dracobot relies on. */
const ATTEMPTS = 2;

export interface RK9TeamResult {
  url: string;
  data: RK9TeamData | null;
  error?: string;
}

async function fetchTeam(url: string): Promise<RK9TeamResult> {
  const urlValidation = parseRK9Url(url);
  if (!urlValidation.valid) {
    return { url, data: null, error: urlValidation.error };
  }

  let lastError = "Failed to fetch team list";

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; TeamListImporter/1.0)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        lastError = `Failed to fetch page: ${response.status}`;
        continue;
      }

      const teamData = parseRK9Html(await response.text());
      if (!teamData) {
        // A page that loads but does not parse will not parse on a retry
        return { url, data: null, error: "Could not parse team data from page" };
      }

      return { url, data: teamData };
    } catch {
      lastError = "Failed to fetch team list";
    }
  }

  return { url, data: null, error: lastError };
}

/**
 * Fetch every URL with a bounded number of requests in flight, preserving
 * input order in the results.
 */
async function fetchAll(urls: string[]): Promise<RK9TeamResult[]> {
  const results: RK9TeamResult[] = new Array(urls.length);
  let next = 0;

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, urls.length) },
    async () => {
      while (true) {
        const index = next++;
        if (index >= urls.length) return;
        results[index] = await fetchTeam(urls[index]);
      }
    }
  );

  await Promise.all(workers);
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls } = body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { success: false, error: "urls must be a non-empty array" },
        { status: 400 }
      );
    }

    if (urls.length > MAX_URLS) {
      return NextResponse.json(
        { success: false, error: `Too many URLs (max ${MAX_URLS})` },
        { status: 400 }
      );
    }

    if (!urls.every((url) => typeof url === "string")) {
      return NextResponse.json(
        { success: false, error: "urls must all be strings" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      results: await fetchAll(urls),
    });
  } catch (error) {
    console.error("RK9 teams import error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
