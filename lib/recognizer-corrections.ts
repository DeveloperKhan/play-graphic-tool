/**
 * Shared corrections: from the teams imported from screenshots in Auto-Generate's review, the
 * tiles worth learning from, sent to team-recognizer's private data repo (through
 * /api/recognizer-corrections). A maintainer reviews each submission before it trains.
 *
 * Only tiles the model got wrong or wasn't sure of go: those changed by hand, those it read
 * below SURE_SPECIES confidence, and those whose shadow call was borderline (see shadowUnsure).
 * Tiles it read confidently and nobody changed add little, so they stay home, and so do teams
 * with nothing to report. Each tile goes as a small crop at full resolution, with the team's name
 * bar for the reviewer. The format is documented in team-recognizer's README ("Your data").
 */

import type { NameMatch, ScreenshotSlot, ScreenshotTeam } from "./screenshot-standings";

export const CORRECTIONS_FORMAT = 2;

/** Below this the model wasn't sure of the species */
export const SURE_SPECIES = 0.9;

type Box = [number, number, number, number];

/** Why a tile is sent */
export type SendReason = "edited" | "species" | "shadow";

export interface CorrectionSlot {
  /** Position in the team's grid, 0-5 row by row */
  index: number;
  /** The tile's image within the submission, e.g. "team-0-slot-3.jpg" */
  image: string;
  /** The tile within its image, as fractions of the image's size */
  box: Box;
  /** What the person kept or set */
  speciesId: string;
  shadow: boolean;
  /** Changed by hand in the review */
  edited: boolean;
  reasons: SendReason[];
  /** What the recognizer read, with its shadow checks when it reported them */
  predicted: {
    speciesId: string;
    shadow: boolean;
    confidence: number;
    shadowViolet: number | null;
    shadowProbe: number | null;
  };
}

export interface CorrectionTeam {
  /** The name bar's image, e.g. "team-0-name.jpg", for the reviewer */
  nameImage: string | null;
  side: "left" | "right" | null;
  /** The name as read off the overlay, and the Dracoviz name it was corrected to, if any */
  read: string | null;
  dracovizName: string | null;
  /** The standings entry the team was imported as */
  player: { name: string; challongeName: string; rank: number };
  /** How the reading matched that entry; "manual" when the team was picked by hand */
  nameMatch: NameMatch | "manual";
  /** Where it came from: the screenshot's name, and which recognizer read it */
  source: string;
  engine: "browser" | "server" | null;
  modelVersion: string | null;
  /** The tiles worth learning from, not all six */
  slots: CorrectionSlot[];
}

export interface CorrectionSubmission {
  format: typeof CORRECTIONS_FORMAT;
  createdAt: string;
  event: { challongeUrl: string; name: string };
  /** "upload" or "discord" */
  via: string;
  teams: CorrectionTeam[];
}

/** An imported row with a screenshot team */
export interface ImportedTeam {
  team: ScreenshotTeam;
  /** The image the team's boxes refer to */
  image: Blob;
  name: string;
  challongeName: string;
  /** 1-based position in the standings */
  rank: number;
  /** How the team's name matched; undefined when it was picked by hand */
  nameMatch?: NameMatch;
}

/**
 * Whether the recognizer's shadow call was borderline. It calls a tile shadow when violet
 * smoke covers 3% of its border or the learned check passes 0.7 (recognizer/shadow.py), so the
 * call is clear with plenty of smoke, or with none and the check well away from 0.7.
 */
export function shadowUnsure(violet: number | undefined, probe: number | undefined): boolean {
  if (violet === undefined || probe === undefined) return false;
  if (violet >= 0.06) return false;
  if (violet >= 0.015) return true;
  return probe > 0.4 && probe < 0.85;
}

/** Why a tile is worth sending; empty when it isn't */
export function sendReasons(slot: ScreenshotSlot): SendReason[] {
  const reasons: SendReason[] = [];
  const predicted = slot.predicted ?? { id: slot.id, isShadow: slot.isShadow, confidence: slot.confidence };
  if (slot.edited) reasons.push("edited");
  if (predicted.confidence < SURE_SPECIES) reasons.push("species");
  if (slot.shadowEligible && shadowUnsure(slot.shadowViolet, slot.shadowProbe)) reasons.push("shadow");
  return reasons;
}

/** A box grown by `pad` of its size on each side, clipped to the image */
export function padBox([x0, y0, x1, y1]: Box, pad: number): Box {
  const px = (x1 - x0) * pad;
  const py = (y1 - y0) * pad;
  return [Math.max(0, x0 - px), Math.max(0, y0 - py), Math.min(1, x1 + px), Math.min(1, y1 + py)];
}

/** A box given in screenshot fractions, as fractions of `region` (a part of the screenshot) */
export function relativeTo(box: Box, region: Box): Box {
  const w = region[2] - region[0];
  const h = region[3] - region[1];
  const round = (v: number) => Math.round(v * 1e4) / 1e4;
  return [
    round((box[0] - region[0]) / w),
    round((box[1] - region[1]) / h),
    round((box[2] - region[0]) / w),
    round((box[3] - region[1]) / h),
  ];
}

/** Room around each tile, so the recognizer's own crop (and the shadow border) has margin */
const TILE_PAD = 0.1;

type Crop = (image: Blob, box: Box) => Promise<{ jpeg: Blob; region: Box }>;

interface PreparedTeam {
  team: CorrectionTeam;
  files: Array<{ name: string; jpeg: Blob }>;
}

/** A team's labels and image crops, or null when none of its tiles is worth sending */
export async function prepareTeam(item: ImportedTeam, teamIndex: number, crop: Crop): Promise<PreparedTeam | null> {
  const { team } = item;
  const chosen = team.pokemon
    .map((slot, index) => ({ slot, index, reasons: sendReasons(slot) }))
    .filter((s) => s.reasons.length > 0 && s.slot.box);
  if (chosen.length === 0) return null;

  const files: PreparedTeam["files"] = [];
  let nameImage: string | null = null;
  if (team.nameBox) {
    nameImage = `team-${teamIndex}-name.jpg`;
    files.push({ name: nameImage, jpeg: (await crop(item.image, padBox(team.nameBox, 0.04))).jpeg });
  }

  const slots: CorrectionSlot[] = [];
  for (const { slot, index, reasons } of chosen) {
    const name = `team-${teamIndex}-slot-${index}.jpg`;
    const { jpeg, region } = await crop(item.image, padBox(slot.box!, TILE_PAD));
    files.push({ name, jpeg });
    const predicted = slot.predicted ?? { id: slot.id, isShadow: slot.isShadow, confidence: slot.confidence };
    slots.push({
      index,
      image: name,
      box: relativeTo(slot.box!, region),
      speciesId: slot.id,
      shadow: slot.id ? slot.isShadow : false,
      edited: Boolean(slot.edited),
      reasons,
      predicted: {
        speciesId: predicted.id,
        shadow: predicted.isShadow,
        confidence: predicted.confidence,
        shadowViolet: slot.shadowViolet ?? null,
        shadowProbe: slot.shadowProbe ?? null,
      },
    });
  }

  return {
    files,
    team: {
      nameImage,
      side: team.side ?? null,
      read: team.read,
      dracovizName: team.dracovizName,
      player: { name: item.name, challongeName: item.challongeName, rank: item.rank },
      nameMatch: item.nameMatch ?? "manual",
      source: team.source,
      engine: team.engine ?? null,
      modelVersion: team.modelVersion ?? null,
      slots,
    },
  };
}

/** Keep each request well under the server's 4.5 MB body limit */
const MAX_BATCH_BYTES = 3_000_000;
const MAX_BATCH_TEAMS = 16;

export interface SendResult {
  teams: number;
  tiles: number;
  edited: number;
  failed: number;
  /** Why the first failed request failed */
  error?: string;
}

/**
 * Pick each team's tiles worth sending, cut them, and post the submission in as few requests as
 * fit. Teams with nothing worth sending are skipped.
 */
export async function sendCorrections(
  items: ImportedTeam[],
  meta: { challongeUrl: string; eventName: string; via: string },
  crop: Crop,
  post: (body: FormData) => Promise<void>
): Promise<SendResult> {
  const prepared: PreparedTeam[] = [];
  for (const item of items) {
    const team = await prepareTeam(item, prepared.length, crop);
    if (team) prepared.push(team);
  }

  const batches: PreparedTeam[][] = [];
  let current: PreparedTeam[] = [];
  let bytes = 0;
  for (const team of prepared) {
    const size = team.files.reduce((n, f) => n + f.jpeg.size, 0);
    if (current.length > 0 && (bytes + size > MAX_BATCH_BYTES || current.length >= MAX_BATCH_TEAMS)) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(team);
    bytes += size;
  }
  if (current.length > 0) batches.push(current);

  const result: SendResult = { teams: 0, tiles: 0, edited: 0, failed: 0 };
  for (const batch of batches) {
    // File names are per submission: renumber each batch's teams from 0
    const renamed = batch.map((p, i) => renumber(p, i));
    const submission: CorrectionSubmission = {
      format: CORRECTIONS_FORMAT,
      createdAt: new Date().toISOString(),
      event: { challongeUrl: meta.challongeUrl, name: meta.eventName },
      via: meta.via,
      teams: renamed.map((p) => p.team),
    };
    const body = new FormData();
    body.append("labels", JSON.stringify(submission));
    renamed.forEach((p) => p.files.forEach((f) => body.append(f.name, f.jpeg, f.name)));
    const tiles = submission.teams.reduce((n, t) => n + t.slots.length, 0);
    try {
      await post(body);
      result.teams += batch.length;
      result.tiles += tiles;
      result.edited += submission.teams.reduce((n, t) => n + t.slots.filter((s) => s.edited).length, 0);
    } catch (error) {
      result.failed += batch.length;
      result.error ??= error instanceof Error ? error.message : String(error);
    }
  }
  return result;
}

/** A prepared team with its file names moved to team number `index` */
function renumber(prepared: PreparedTeam, index: number): PreparedTeam {
  const rename = (name: string) => name.replace(/^team-\d+-/, `team-${index}-`);
  return {
    files: prepared.files.map((f) => ({ ...f, name: rename(f.name) })),
    team: {
      ...prepared.team,
      nameImage: prepared.team.nameImage && rename(prepared.team.nameImage),
      slots: prepared.team.slots.map((s) => ({ ...s, image: rename(s.image) })),
    },
  };
}
