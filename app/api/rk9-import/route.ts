import { NextRequest, NextResponse } from "next/server";
import { parseRK9Url, parseRK9Html } from "@/lib/rk9-import";

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
