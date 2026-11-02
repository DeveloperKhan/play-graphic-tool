/**
 * Screenshot import: recognize the teams in a broadcast-overlay screenshot and turn them
 * into players.
 *
 * The team recognizer (../team-recognizer) finds each team grid in the image (one for a
 * cropped player panel, two for a full broadcast frame) and returns the player name and
 * country it read, plus six Dracoviz speciesIds with shadow flags and confidences.
 *
 * It runs in the browser (vendor/team-recognizer: a Web Worker with the models under
 * public/team-recognizer/), which is fast once the models are downloaded. If this browser
 * can't run it, the same recognizer is called as a server API instead.
 */

import { createLocalRecognizer, type LocalRecognizer } from "@/vendor/team-recognizer/client";
import { RECOGNIZER_BASE_URL } from "@/vendor/team-recognizer/version";
import type { Player } from "./types";

/** [x0, y0, x1, y1] as fractions of the image's width and height. */
export type RelativeBox = [number, number, number, number];

export interface RecognizedPokemon {
  speciesId: string;
  shadow: boolean;
  confidence: number;
  alternatives: Array<{ speciesId: string; confidence: number }>;
  /** Where the tile is in the uploaded image. */
  box?: RelativeBox;
}

export interface RecognizedTeam {
  side: "left" | "right" | null;
  /** The closest Dracoviz player name, or the OCR reading if none was close enough. */
  player: string | null;
  /** What OCR read on the overlay. */
  playerRead?: string | null;
  country: string | null;
  /** Where the name bar is in the uploaded image. */
  nameBox?: RelativeBox;
  pokemon: RecognizedPokemon[];
}

/** Below this confidence a recognized Pokémon is highlighted for review. */
export const LOW_CONFIDENCE = 0.6;

/** Largest side sent to the recognizer; keeps uploads well under Vercel's 4.5 MB body limit. */
const MAX_UPLOAD_SIDE = 2000;

/**
 * Re-encode an image as JPEG no larger than MAX_UPLOAD_SIDE on its longest side.
 * Full-resolution PNG screenshots can exceed the request size limit, and the
 * recognizer doesn't need more pixels than this.
 */
export async function prepareUpload(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_UPLOAD_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image"))),
      "image/jpeg",
      0.92
    )
  );
}

let local: LocalRecognizer | null = null;
let localUnavailable = false;
const progressListeners = new Set<(loaded: number, total: number) => void>();

/**
 * Start loading the in-browser recognizer (downloads its models the first time; the browser
 * caches them afterwards). Resolves false if this browser can't run it.
 */
export function loadLocalRecognizer(onProgress?: (loaded: number, total: number) => void): Promise<boolean> {
  if (onProgress) progressListeners.add(onProgress);
  if (localUnavailable || typeof Worker === "undefined") return Promise.resolve(false);
  if (!local) {
    local = createLocalRecognizer({
      baseUrl: RECOGNIZER_BASE_URL,
      onProgress: (loaded, total) => progressListeners.forEach((listener) => listener(loaded, total)),
    });
  }
  return local.ready.then(
    () => true,
    (error) => {
      console.warn("In-browser recognizer unavailable, using the server:", error);
      localUnavailable = true;
      local?.dispose();
      local = null;
      return false;
    }
  );
}

async function matchPlayerNames(teams: RecognizedTeam[]): Promise<RecognizedTeam[]> {
  try {
    const response = await fetch("/api/match-player-names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names: teams.map((t) => t.player) }),
    });
    const result = await response.json();
    if (!response.ok || !result?.success) throw new Error(result?.error ?? response.statusText);
    return teams.map((team, i) => ({ ...team, player: result.data.names[i], playerRead: team.player }));
  } catch (error) {
    // Names stay as read; everything else is unaffected.
    console.warn("Could not match player names:", error);
    return teams;
  }
}

async function recognizeOnServer(file: Blob): Promise<{ teams: RecognizedTeam[]; image: Blob }> {
  const image = await prepareUpload(file);
  const body = new FormData();
  body.append("image", image, "screenshot.jpg");
  const response = await fetch("/api/screenshot-import", { method: "POST", body });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || `Recognition failed (${response.status})`);
  }
  return { teams: result.data.teams as RecognizedTeam[], image };
}

/**
 * Recognize the teams in a screenshot, in the browser when possible. Also returns the image
 * the boxes in the result refer to.
 */
export async function recognizeScreenshot(
  file: Blob
): Promise<{ teams: RecognizedTeam[]; image: Blob; where: "browser" | "server" }> {
  if (await loadLocalRecognizer()) {
    try {
      const { teams } = await local!.recognize(file);
      return { teams: await matchPlayerNames(teams), image: file, where: "browser" };
    } catch (error) {
      console.warn("In-browser recognition failed, using the server:", error);
    }
  }
  return { ...(await recognizeOnServer(file)), where: "server" };
}

/**
 * Cut regions out of an image as small JPEG data URLs (no taller than `height` px),
 * for showing the screenshot's own tiles next to what they were recognized as.
 * Missing boxes give undefined.
 */
export async function cropRegions(
  image: Blob,
  boxes: Array<RelativeBox | undefined>,
  height = 96
): Promise<Array<string | undefined>> {
  const bitmap = await createImageBitmap(image);
  try {
    return boxes.map((box) => {
      if (!box) return undefined;
      const [x0, y0, x1, y1] = box;
      const sx = x0 * bitmap.width;
      const sy = y0 * bitmap.height;
      const sw = (x1 - x0) * bitmap.width;
      const sh = (y1 - y0) * bitmap.height;
      if (sw < 2 || sh < 2) return undefined;
      const scale = Math.min(1, height / sh);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sw * scale));
      canvas.height = Math.max(1, Math.round(sh * scale));
      canvas.getContext("2d")?.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.85);
    });
  } finally {
    bitmap.close();
  }
}

/** A slot with no name and no Pokémon, i.e. one a screenshot import may fill. */
export function isEmptyPlayer(player: Pick<Player, "name" | "team"> | undefined): boolean {
  if (!player) return true;
  return !player.name?.trim() && player.team.every((pokemon) => !pokemon?.id);
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}
