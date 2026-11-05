import { NextRequest, NextResponse } from "next/server";
import { allowedChannels, isAllowedAttachmentUrl } from "@/lib/discord";

/**
 * One screenshot from Discord's CDN, passed through for the browser (which can't fetch it
 * directly). Only attachments in the channels auto-generate may read are served, and the
 * body is streamed, so large PNGs aren't held to the function's response size limit.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url") ?? "";
  if (!isAllowedAttachmentUrl(url, allowedChannels())) {
    return NextResponse.json({ success: false, error: "Not an attachment in an allowed channel" }, { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, { cache: "no-store" });
  } catch {
    return NextResponse.json({ success: false, error: "Could not reach Discord's CDN" }, { status: 502 });
  }
  const type = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !upstream.body || !type.startsWith("image/")) {
    // Signed links expire after about a day; listing the channel again gives fresh ones.
    return NextResponse.json(
      { success: false, error: upstream.ok ? "Not an image" : `Discord's CDN returned ${upstream.status}` },
      { status: upstream.status === 404 || upstream.status === 403 ? 410 : 502 }
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=3600",
      ...(upstream.headers.get("content-length")
        ? { "Content-Length": upstream.headers.get("content-length")! }
        : {}),
    },
  });
}
