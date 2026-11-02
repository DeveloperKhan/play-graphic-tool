import { NextRequest, NextResponse } from "next/server";
import { matchNames } from "@/lib/dracoviz-names";

/**
 * Names read off overlay screenshots → the closest Dracoviz player names. Used when the
 * screenshot was recognized in the browser; the Dracoviz key stays on the server.
 */
export async function POST(request: NextRequest) {
  try {
    const { names } = await request.json();
    if (!Array.isArray(names) || names.length > 32 || names.some((n) => n !== null && typeof n !== "string")) {
      return NextResponse.json({ success: false, error: "names must be an array of up to 32 strings" }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: { names: await matchNames(names) } });
  } catch (error) {
    console.error("Name matching error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
