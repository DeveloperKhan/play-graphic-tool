/**
 * Shared corrections: the teams imported from screenshots in Auto-Generate's review, with the
 * species and shadow forms a person confirmed or fixed, sent to team-recognizer's private data
 * repo (through /api/recognizer-corrections) so later models learn from them. A maintainer
 * reviews each submission before it trains.
 *
 * Each team goes as one JPEG of its panel (the name bar and the six tiles, cut from the
 * screenshot at full resolution; nothing else of the frame) plus its labels. The format is
 * documented in team-recognizer's README ("Your data").
 */

import type { NameMatch, ScreenshotTeam } from "./screenshot-standings";

export const CORRECTIONS_FORMAT = 1;

type Box = [number, number, number, number];

export interface CorrectionSlot {
  /** What the person kept or set; "" if the tile was left unrecognized */
  speciesId: string;
  shadow: boolean;
  /** Changed by hand in the review */
  edited: boolean;
  /** What the recognizer read */
  predicted: { speciesId: string; shadow: boolean; confidence: number };
  /** The tile within the team's image, as fractions of its size */
  box: Box;
}

export interface CorrectionTeam {
  /** The team's panel image within the submission, e.g. "team-0.jpg" */
  image: string;
  side: "left" | "right" | null;
  /** The name as read off the overlay, and the Dracoviz name it was corrected to, if any */
  read: string | null;
  dracovizName: string | null;
  /** The standings entry the team was imported as */
  player: { name: string; challongeName: string; rank: number };
  /** How the reading matched that entry; "manual" when the team was picked by hand */
  nameMatch: NameMatch | "manual";
  /** The name bar within the team's image */
  nameBox: Box | null;
  /** Where it came from: the screenshot's name, and which recognizer read it */
  source: string;
  engine: "browser" | "server" | null;
  modelVersion: string | null;
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

/** The part of the screenshot a team's panel covers: its name bar and tiles, padded a little */
export function panelBox(team: ScreenshotTeam, pad = 0.06): Box | null {
  const boxes = [team.nameBox, ...team.pokemon.map((p) => p.box)].filter((b): b is Box => Boolean(b));
  if (boxes.length < team.pokemon.length) return null;
  const x0 = Math.min(...boxes.map((b) => b[0]));
  const y0 = Math.min(...boxes.map((b) => b[1]));
  const x1 = Math.max(...boxes.map((b) => b[2]));
  const y1 = Math.max(...boxes.map((b) => b[3]));
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

/** One team's labels, with its boxes relative to the cut `region` of its screenshot */
export function correctionTeam(item: ImportedTeam, imageName: string, region: Box): CorrectionTeam {
  const { team } = item;
  return {
    image: imageName,
    side: team.side ?? null,
    read: team.read,
    dracovizName: team.dracovizName,
    player: { name: item.name, challongeName: item.challongeName, rank: item.rank },
    nameMatch: item.nameMatch ?? "manual",
    nameBox: team.nameBox ? relativeTo(team.nameBox, region) : null,
    source: team.source,
    engine: team.engine ?? null,
    modelVersion: team.modelVersion ?? null,
    slots: team.pokemon.map((slot) => {
      const predicted = slot.predicted ?? { id: slot.id, isShadow: slot.isShadow, confidence: slot.confidence };
      return {
        speciesId: slot.id,
        shadow: slot.id ? slot.isShadow : false,
        edited: Boolean(slot.edited),
        predicted: { speciesId: predicted.id, shadow: predicted.isShadow, confidence: predicted.confidence },
        box: relativeTo(slot.box!, region),
      };
    }),
  };
}

/** Teams whose tiles can be cut: every tile has a box */
export function shareable(items: ImportedTeam[]): ImportedTeam[] {
  return items.filter((item) => panelBox(item.team) !== null && item.team.pokemon.length === 6);
}

/** Keep each request well under the server's 4.5 MB body limit */
const MAX_BATCH_BYTES = 3_500_000;
const MAX_BATCH_TEAMS = 16;

export interface SendResult {
  teams: number;
  edited: number;
  failed: number;
  /** Why the first failed request failed */
  error?: string;
}

/**
 * Cut each team's panel, then post the submission in as few requests as fit. Resolves with how
 * many teams and hand-edited tiles were sent.
 */
export async function sendCorrections(
  items: ImportedTeam[],
  meta: { challongeUrl: string; eventName: string; via: string },
  crop: (image: Blob, box: Box) => Promise<{ jpeg: Blob; region: Box }>,
  post: (body: FormData) => Promise<void>
): Promise<SendResult> {
  const cut = await Promise.all(
    shareable(items).map(async (item) => ({ item, ...(await crop(item.image, panelBox(item.team)!)) }))
  );

  const batches: (typeof cut)[] = [];
  let current: typeof cut = [];
  let bytes = 0;
  for (const entry of cut) {
    if (current.length > 0 && (bytes + entry.jpeg.size > MAX_BATCH_BYTES || current.length >= MAX_BATCH_TEAMS)) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(entry);
    bytes += entry.jpeg.size;
  }
  if (current.length > 0) batches.push(current);

  const result: SendResult = { teams: 0, edited: 0, failed: 0 };
  for (const batch of batches) {
    const submission: CorrectionSubmission = {
      format: CORRECTIONS_FORMAT,
      createdAt: new Date().toISOString(),
      event: { challongeUrl: meta.challongeUrl, name: meta.eventName },
      via: meta.via,
      teams: batch.map(({ item, region }, i) => correctionTeam(item, `team-${i}.jpg`, region)),
    };
    const body = new FormData();
    body.append("labels", JSON.stringify(submission));
    batch.forEach(({ jpeg }, i) => body.append(`team-${i}.jpg`, jpeg, `team-${i}.jpg`));
    try {
      await post(body);
      result.teams += batch.length;
      result.edited += submission.teams.reduce((n, t) => n + t.slots.filter((s) => s.edited).length, 0);
    } catch (error) {
      result.failed += batch.length;
      result.error ??= error instanceof Error ? error.message : String(error);
    }
  }
  return result;
}
