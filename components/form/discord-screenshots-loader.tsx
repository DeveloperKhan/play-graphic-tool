"use client";

import * as React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Channel {
  id: string;
  name: string;
  /** Set when the bot can't read the channel */
  error: string | null;
}

interface ListedImage {
  url: string;
  filename: string;
  postedAt: string;
  author: string;
}

type Status =
  | { kind: "idle" }
  | { kind: "listing" }
  | { kind: "downloading"; done: number; total: number; failed: number }
  | { kind: "done"; count: number; failed: number; truncated: boolean; maxImages: number }
  | { kind: "error"; message: string };

/** Downloads in flight at once */
const CONCURRENCY = 4;

/** The default window covers an event's days: today and the two before it */
const DEFAULT_DAYS = 3;

// Outside the component: only called from initializers and event handlers.
const defaultStart = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (DEFAULT_DAYS - 1));
  return date;
};

/** A Date as a datetime-local input value, in local time */
function toInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The name a downloaded screenshot is listed under: when it was posted, by whom */
function screenshotName(image: ListedImage): string {
  const time = new Date(image.postedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${time} · ${image.author || "unknown"} · ${image.filename}`;
}

/** A channel and time window to load, from a link (see readLinkedRequest in the dialog) */
export interface DiscordWindow {
  channel: string;
  since: number;
  until: number | null;
}

/**
 * Load the screenshots posted in a Discord channel over a time window, and hand each one to
 * `onFiles` as it downloads, so recognition starts before the last one arrives. With
 * `initial`, that window is filled in and loaded straight away; `onDone` is called once every
 * screenshot has been handed over.
 */
export function DiscordScreenshotsLoader({
  onFiles,
  onDone,
  initial,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  onDone?: () => void;
  initial?: DiscordWindow | null;
  disabled?: boolean;
}) {
  const [channels, setChannels] = React.useState<Channel[] | null>(null);
  const [setupError, setSetupError] = React.useState<string | null>(null);
  const [channel, setChannel] = React.useState("");
  const [since, setSince] = React.useState(() =>
    toInputValue(initial ? new Date(initial.since) : defaultStart())
  );
  const [until, setUntil] = React.useState(() =>
    initial?.until ? toInputValue(new Date(initial.until)) : ""
  );
  const [status, setStatus] = React.useState<Status>({ kind: "idle" });
  // The latest props, for the one-time load on mount
  const latest = React.useRef({ onFiles, onDone, initial });
  React.useEffect(() => {
    latest.current = { onFiles, onDone, initial };
  });

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/discord-screenshots")
      .then((response) => response.json())
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          setSetupError(result.error || "Discord isn't available");
          return;
        }
        setChannels(result.channels);
        const usable = (result.channels as Channel[]).filter((c) => !c.error);
        const linked = latest.current.initial;
        if (linked) {
          if (!usable.some((c) => c.id === linked.channel)) {
            setStatus({ kind: "error", message: "The link's channel isn't one auto-generate may read" });
            return;
          }
          setChannel(linked.channel);
          void load(linked.channel, linked.since, linked.until);
        } else if (usable.length > 0) {
          setChannel(usable[0].id);
        }
      })
      .catch(() => !cancelled && setSetupError("Failed to connect to server"));
    return () => {
      cancelled = true;
    };
  }, []);

  const busy = status.kind === "listing" || status.kind === "downloading";

  const handleLoad = () => {
    const sinceMs = new Date(since).getTime();
    const untilMs = until ? new Date(until).getTime() : null;
    if (!channel || Number.isNaN(sinceMs) || (untilMs !== null && Number.isNaN(untilMs))) return;
    void load(channel, sinceMs, untilMs);
  };

  async function load(channelId: string, sinceMs: number, untilMs: number | null) {
    setStatus({ kind: "listing" });
    let listed: { images: ListedImage[]; truncated: boolean; maxImages: number };
    try {
      const response = await fetch("/api/discord-screenshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: channelId, since: sinceMs, until: untilMs }),
      });
      const result = await response.json();
      if (!result.success) {
        setStatus({ kind: "error", message: result.error || "Failed to read the channel" });
        return;
      }
      listed = result;
    } catch {
      setStatus({ kind: "error", message: "Failed to connect to server" });
      return;
    }

    const { images } = listed;
    let done = 0;
    let failed = 0;
    setStatus({ kind: "downloading", done, total: images.length, failed });

    let next = 0;
    const worker = async () => {
      while (next < images.length) {
        const image = images[next++];
        try {
          const response = await fetch(image.url);
          if (!response.ok) throw new Error(String(response.status));
          const blob = await response.blob();
          latest.current.onFiles([new File([blob], screenshotName(image), { type: blob.type || "image/png" })]);
        } catch {
          failed++;
        }
        done++;
        setStatus({ kind: "downloading", done, total: images.length, failed });
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, images.length) }, worker));

    setStatus({
      kind: "done",
      count: images.length - failed,
      failed,
      truncated: listed.truncated,
      maxImages: listed.maxImages,
    });
    latest.current.onDone?.();
  }

  if (setupError) {
    return (
      <div className="flex items-start gap-2 p-3 text-sm bg-destructive/10 text-destructive rounded-md">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <p>{setupError}</p>
      </div>
    );
  }

  const selected = channels?.find((c) => c.id === channel);

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="space-y-1.5">
        <Label htmlFor="discord-channel">Channel</Label>
        {channels === null ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading channels…
          </p>
        ) : (
          <Select value={channel} onValueChange={setChannel} disabled={disabled || busy}>
            <SelectTrigger id="discord-channel" className="h-8">
              <SelectValue placeholder="Pick a channel" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((c) => (
                <SelectItem key={c.id} value={c.id} disabled={!!c.error}>
                  #{c.name}
                  {c.error && <span className="ml-1.5 text-muted-foreground">({c.error})</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="discord-since">Posted from</Label>
          <Input
            id="discord-since"
            type="datetime-local"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            disabled={disabled || busy}
            className="h-8"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="discord-until">Until</Label>
          <Input
            id="discord-until"
            type="datetime-local"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            disabled={disabled || busy}
            className="h-8"
          />
          <p className="text-[11px] text-muted-foreground">Leave empty for now.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleLoad}
          disabled={disabled || busy || !selected || !!selected.error || !since}
        >
          {busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          Load screenshots
        </Button>
        <p className="text-xs text-muted-foreground">
          {status.kind === "listing" && "Reading the channel…"}
          {status.kind === "downloading" &&
            `Downloading ${status.done} of ${status.total}${status.failed ? ` (${status.failed} failed)` : ""}…`}
          {status.kind === "done" &&
            (status.count === 0 && status.failed === 0
              ? "No images were posted in that window."
              : `Loaded ${status.count} screenshot${status.count !== 1 ? "s" : ""}${
                  status.failed ? `; ${status.failed} couldn't be downloaded` : ""
                }${status.truncated ? ` (the newest ${status.maxImages}; narrow the window for older ones)` : ""}.`)}
          {status.kind === "error" && <span className="text-destructive">{status.message}</span>}
        </p>
      </div>
    </div>
  );
}
