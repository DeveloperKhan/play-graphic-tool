/**
 * Discord channel screenshots for auto-generate: the image attachments posted in a channel over
 * a time window, so players can drop broadcast screenshots in Discord during an event instead of
 * uploading them here.
 *
 * Server-side only. Uses the bot in BOT_TOKEN, which needs View Channel and Read Message History
 * in the channel, and the Message Content intent (without it Discord leaves attachments out).
 * Only the channels listed in DISCORD_SCREENSHOT_CHANNELS (comma-separated ids) can be read, so
 * the public tool can't be pointed at any channel the bot happens to see.
 */

const API_BASE = "https://discord.com/api/v10";
const DISCORD_EPOCH = BigInt(1420070400000);

/** Stop paging after this many messages or images, however long the window (a busy channel
 * over an event's three days stays well under it). */
const MAX_MESSAGES = 15000;
export const MAX_IMAGES = 400;

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif|bmp)$/i;
const CDN_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net"]);

export interface ChannelImage {
  /** Signed Discord CDN link; valid for about a day, so it's listed fresh each time. */
  url: string;
  filename: string;
  /** ISO timestamp of the message it was posted in. */
  postedAt: string;
  author: string;
  width: number | null;
  height: number | null;
}

interface DiscordAttachment {
  id: string;
  filename: string;
  content_type?: string;
  url: string;
  width?: number | null;
  height?: number | null;
}

interface DiscordMessage {
  id: string;
  timestamp: string;
  author?: { username?: string; global_name?: string | null };
  attachments?: DiscordAttachment[];
}

export class DiscordError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** The channels auto-generate may read, from DISCORD_SCREENSHOT_CHANNELS. */
export function allowedChannels(): string[] {
  return (process.env.DISCORD_SCREENSHOT_CHANNELS ?? "")
    .split(/[\s,]+/)
    .filter((id) => /^\d{15,25}$/.test(id));
}

/** A Discord snowflake for a moment in time, for paging messages by date. */
export function snowflakeAt(ms: number): string {
  return ((BigInt(Math.max(0, Math.floor(ms))) - DISCORD_EPOCH) << BigInt(22)).toString();
}

/**
 * Whether a link is an attachment on Discord's CDN in one of the allowed channels. Attachment
 * paths carry their channel: /attachments/<channel id>/<attachment id>/<filename>.
 */
export function isAllowedAttachmentUrl(url: string, channels: string[]): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" || !CDN_HOSTS.has(parsed.hostname)) return false;
  const [kind, channel] = parsed.pathname.split("/").filter(Boolean);
  return kind === "attachments" && channels.includes(channel);
}

function isImage(attachment: DiscordAttachment): boolean {
  return attachment.content_type
    ? attachment.content_type.startsWith("image/")
    : IMAGE_EXTENSIONS.test(attachment.filename);
}

/** One Discord API call, waiting out rate limits. */
export async function discordGet<T>(path: string, token: string, fetchImpl: typeof fetch = fetch): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetchImpl(`${API_BASE}${path}`, {
        headers: {
          Authorization: `Bot ${token}`,
          "User-Agent": "DiscordBot (https://github.com/DeveloperKhan, 1.0) play-graphic-tool",
        },
        cache: "no-store",
      });
    } catch {
      throw new DiscordError("Could not reach the Discord API", 502);
    }

    if (response.status === 429 && attempt < 5) {
      const body = await response.json().catch(() => ({}));
      const seconds = Number(body.retry_after ?? response.headers.get("retry-after") ?? 1);
      await new Promise((resolve) => setTimeout(resolve, Math.min(10, Math.max(0.1, seconds)) * 1000));
      continue;
    }
    if (response.status === 401) throw new DiscordError("Discord rejected the bot token (BOT_TOKEN)", 502);
    if (response.status === 403) {
      throw new DiscordError("The bot can't read this channel: it needs View Channel and Read Message History", 403);
    }
    if (response.status === 404) throw new DiscordError("Discord channel not found", 404);
    if (!response.ok) throw new DiscordError(`Discord API returned ${response.status}`, 502);
    return (await response.json()) as T;
  }
}

/**
 * The images posted in a channel between `sinceMs` and `untilMs`, oldest first. Pages backwards
 * from `untilMs` until it passes `sinceMs`, up to MAX_MESSAGES messages and MAX_IMAGES images.
 */
export async function listChannelImages(
  channel: string,
  sinceMs: number,
  untilMs: number,
  token: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ images: ChannelImage[]; truncated: boolean }> {
  const images: ChannelImage[] = [];
  let before = snowflakeAt(untilMs);
  let read = 0;

  for (;;) {
    const page = await discordGet<DiscordMessage[]>(
      `/channels/${channel}/messages?limit=100&before=${before}`,
      token,
      fetchImpl
    );
    if (page.length === 0) break;
    read += page.length;

    let reachedStart = false;
    for (const message of page) {
      // Newest first within a page
      if (Date.parse(message.timestamp) < sinceMs) {
        reachedStart = true;
        break;
      }
      for (const attachment of message.attachments ?? []) {
        if (!isImage(attachment)) continue;
        images.push({
          url: attachment.url,
          filename: attachment.filename,
          postedAt: message.timestamp,
          author: message.author?.global_name || message.author?.username || "",
          width: attachment.width ?? null,
          height: attachment.height ?? null,
        });
      }
    }

    if (images.length >= MAX_IMAGES) {
      return { images: images.slice(0, MAX_IMAGES).reverse(), truncated: true };
    }
    if (reachedStart || page.length < 100) break;
    if (read >= MAX_MESSAGES) return { images: images.reverse(), truncated: true };
    before = page[page.length - 1].id;
  }

  return { images: images.reverse(), truncated: false };
}
