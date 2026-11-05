import { NextRequest, NextResponse } from "next/server";
import {
  DiscordError,
  MAX_IMAGES,
  allowedChannels,
  discordGet,
  listChannelImages,
} from "@/lib/discord";

/**
 * Screenshots posted in a Discord channel, for auto-generate.
 *
 *   GET   the channels auto-generate may read, with their names
 *   POST  { channel, since, until } (ms timestamps) -> the images posted in that window, each
 *         with a link through ./image (the browser can't fetch Discord's CDN itself)
 */

function configError(): NextResponse | null {
  if (!process.env.BOT_TOKEN) {
    return NextResponse.json(
      { success: false, error: "Discord isn't set up: BOT_TOKEN is missing in the server environment." },
      { status: 503 }
    );
  }
  if (allowedChannels().length === 0) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Discord isn't set up: list the screenshot channel ids in DISCORD_SCREENSHOT_CHANNELS (comma-separated) in the server environment.",
      },
      { status: 503 }
    );
  }
  return null;
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof DiscordError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  console.error("Discord screenshots error:", error);
  return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
}

export async function GET() {
  const notReady = configError();
  if (notReady) return notReady;
  const token = process.env.BOT_TOKEN!;

  try {
    const channels = await Promise.all(
      allowedChannels().map(async (id) => {
        try {
          const channel = await discordGet<{ name?: string }>(`/channels/${id}`, token);
          return { id, name: channel.name ?? id, error: null };
        } catch (error) {
          return { id, name: id, error: error instanceof Error ? error.message : "Unavailable" };
        }
      })
    );
    return NextResponse.json({ success: true, channels });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const notReady = configError();
  if (notReady) return notReady;

  try {
    const { channel, since, until } = await request.json();
    if (typeof channel !== "string" || !allowedChannels().includes(channel)) {
      return NextResponse.json({ success: false, error: "That channel isn't one auto-generate may read" }, { status: 403 });
    }
    const sinceMs = Number(since);
    const untilMs = until === undefined || until === null || until === "" ? Date.now() : Number(until);
    if (!Number.isFinite(sinceMs) || !Number.isFinite(untilMs) || sinceMs >= untilMs) {
      return NextResponse.json({ success: false, error: "Pick a start time before the end time" }, { status: 400 });
    }

    const { images, truncated } = await listChannelImages(channel, sinceMs, untilMs, process.env.BOT_TOKEN!);
    return NextResponse.json({
      success: true,
      truncated,
      maxImages: MAX_IMAGES,
      images: images.map((image) => ({
        ...image,
        url: `/api/discord-screenshots/image?url=${encodeURIComponent(image.url)}`,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
