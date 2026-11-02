/**
 * Screenshot import: send a broadcast-overlay screenshot to the team recognizer
 * (../team-recognizer, deployed separately) and turn its result into players.
 *
 * The recognizer finds each team grid in the image (one for a cropped player panel,
 * two for a full broadcast frame) and returns the player name and country it read,
 * plus six Dracoviz speciesIds with shadow flags and confidences.
 */

import type { Player } from "./types";

export interface RecognizedPokemon {
  speciesId: string;
  shadow: boolean;
  confidence: number;
  alternatives: Array<{ speciesId: string; confidence: number }>;
}

export interface RecognizedTeam {
  side: "left" | "right" | null;
  /** The closest Dracoviz player name, or the OCR reading if none was close enough. */
  player: string | null;
  /** What OCR read on the overlay. */
  playerRead?: string | null;
  country: string | null;
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

export async function recognizeScreenshot(file: Blob): Promise<RecognizedTeam[]> {
  const body = new FormData();
  body.append("image", await prepareUpload(file), "screenshot.jpg");
  const response = await fetch("/api/screenshot-import", { method: "POST", body });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || `Recognition failed (${response.status})`);
  }
  return result.data.teams as RecognizedTeam[];
}

/** A slot with no name and no Pokémon, i.e. one a screenshot import may fill. */
export function isEmptyPlayer(player: Pick<Player, "name" | "team"> | undefined): boolean {
  if (!player) return true;
  return !player.name?.trim() && player.team.every((pokemon) => !pokemon?.id);
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}
