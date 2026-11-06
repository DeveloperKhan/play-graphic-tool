import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { GitHubError, commitFiles } from "@/lib/github-commit";
import { getAllPokemon } from "@/lib/pokemon-data";
import { CORRECTIONS_FORMAT, type CorrectionSubmission } from "@/lib/recognizer-corrections";

/**
 * Shared recognizer corrections from Auto-Generate's review, committed to team-recognizer's
 * private data repo under corrections/inbox/ for a maintainer to review before training.
 *
 *   GET   { enabled }: whether sharing is configured
 *   POST  multipart: "labels" (a CorrectionSubmission) and the tile and name-bar crops it names
 *
 * Needs CORRECTIONS_GITHUB_TOKEN (fine-grained, Contents read/write on that repo only) and
 * CORRECTIONS_REPO ("owner/name"); CORRECTIONS_BRANCH defaults to main.
 */

const MAX_TEAMS = 16;
const MAX_IMAGE_BYTES = 500_000;
const SPECIES_ID = /^[a-z0-9_]{0,64}$/;
const REASONS = new Set(["edited", "species", "shadow"]);

function target() {
  const token = process.env.CORRECTIONS_GITHUB_TOKEN;
  const repo = process.env.CORRECTIONS_REPO;
  if (!token || !repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return null;
  return { token, repo, branch: process.env.CORRECTIONS_BRANCH || "main" };
}

const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

const isBox = (box: unknown) =>
  Array.isArray(box) && box.length === 4 && box.every((v) => typeof v === "number" && v >= -0.05 && v <= 1.05);
const isText = (value: unknown, max: number) => value === null || (typeof value === "string" && value.length <= max);

const isScore = (value: unknown) => value === null || (typeof value === "number" && value >= 0 && value <= 1);

/**
 * Shape checks, returning the image names the submission refers to; the maintainer's review is
 * what decides whether it trains.
 */
function validate(submission: CorrectionSubmission, known: Set<string> | null): { error: string } | { images: string[] } {
  if (submission?.format !== CORRECTIONS_FORMAT) return { error: "Unsupported corrections format" };
  if (!Array.isArray(submission.teams) || submission.teams.length === 0 || submission.teams.length > MAX_TEAMS) {
    return { error: `Expected 1 to ${MAX_TEAMS} teams` };
  }
  if (!isText(submission.event?.challongeUrl, 300) || !isText(submission.event?.name, 200)) return { error: "Bad event" };
  const images: string[] = [];
  for (const [i, team] of submission.teams.entries()) {
    const bad = (what: string) => ({ error: `Team ${i}: ${what}` });
    if (team.nameImage !== null && team.nameImage !== `team-${i}-name.jpg`) return bad("unexpected name image");
    if (team.nameImage) images.push(team.nameImage);
    if (!isText(team.read, 64) || !isText(team.dracovizName, 64) || !isText(team.source, 300)) return bad("bad names");
    if (!isText(team.player?.name, 64) || !isText(team.player?.challongeName, 64)) return bad("bad player");
    if (!Array.isArray(team.slots) || team.slots.length === 0 || team.slots.length > 6) return bad("expected 1 to 6 tiles");
    const seen = new Set<number>();
    for (const slot of team.slots) {
      if (!Number.isInteger(slot.index) || slot.index < 0 || slot.index > 5 || seen.has(slot.index)) {
        return bad("bad tile position");
      }
      seen.add(slot.index);
      if (slot.image !== `team-${i}-slot-${slot.index}.jpg`) return bad("unexpected tile image");
      images.push(slot.image);
      const ids = [slot.speciesId, slot.predicted?.speciesId];
      if (ids.some((id) => typeof id !== "string" || !SPECIES_ID.test(id))) return bad("bad species id");
      if (known && slot.speciesId && !known.has(slot.speciesId)) return bad(`unknown species ${slot.speciesId}`);
      if (typeof slot.shadow !== "boolean" || typeof slot.edited !== "boolean" || !isBox(slot.box)) {
        return bad("bad tile");
      }
      if (!Array.isArray(slot.reasons) || slot.reasons.length === 0 || slot.reasons.some((r) => !REASONS.has(r))) {
        return bad("bad reasons");
      }
      const { confidence, shadowViolet, shadowProbe } = slot.predicted ?? {};
      if (typeof confidence !== "number" || !isScore(confidence) || !isScore(shadowViolet) || !isScore(shadowProbe)) {
        return bad("bad scores");
      }
    }
  }
  return { images };
}

/** "https://x.challonge.com/2027_GO_Baltimore" -> "2027_go_baltimore", for the folder name */
function eventSlug(challongeUrl: string): string {
  try {
    const slug = new URL(challongeUrl).pathname.split("/").filter(Boolean)[0] ?? "";
    return slug.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 40) || "event";
  } catch {
    return "event";
  }
}

export async function GET() {
  return NextResponse.json({ success: true, enabled: target() !== null });
}

export async function POST(request: NextRequest) {
  const repo = target();
  if (!repo) return fail("Sharing corrections isn't set up on this server", 503);

  let form: FormData;
  let submission: CorrectionSubmission;
  try {
    form = await request.formData();
    submission = JSON.parse(String(form.get("labels") ?? ""));
  } catch {
    return fail("Expected multipart form data with a labels field");
  }

  const known = await getAllPokemon()
    .then((list) => new Set(list.map((p) => p.speciesId)))
    .catch(() => null);
  const checked = validate(submission, known);
  if ("error" in checked) return fail(checked.error);

  const files: Array<{ path: string; content: Uint8Array }> = [];
  const date = new Date().toISOString().slice(0, 10);
  const folder = `corrections/inbox/${date}-${eventSlug(submission.event.challongeUrl)}-${randomBytes(3).toString("hex")}`;
  for (const name of checked.images) {
    const file = form.get(name);
    if (!(file instanceof Blob)) return fail(`Missing ${name}`);
    if (file.size > MAX_IMAGE_BYTES) return fail(`${name} is too large`);
    const content = new Uint8Array(await file.arrayBuffer());
    if (content[0] !== 0xff || content[1] !== 0xd8 || content[2] !== 0xff) return fail(`${name} isn't a JPEG`);
    files.push({ path: `${folder}/${name}`, content });
  }
  const labels = { ...submission, receivedAt: new Date().toISOString() };
  files.push({ path: `${folder}/labels.json`, content: new TextEncoder().encode(JSON.stringify(labels, null, 2) + "\n") });

  const tiles = submission.teams.reduce((n, t) => n + t.slots.length, 0);
  const edited = submission.teams.reduce((n, t) => n + t.slots.filter((s) => s.edited).length, 0);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  try {
    const { commit } = await commitFiles(
      repo,
      files,
      `Add ${plural(tiles, "tile")} (${edited} changed by hand) from ${
        submission.event.name || eventSlug(submission.event.challongeUrl)
      }`
    );
    return NextResponse.json({ success: true, path: folder, commit });
  } catch (error) {
    if (error instanceof GitHubError) return fail(error.message, error.status === 409 ? 503 : 502);
    console.error("Recognizer corrections error:", error);
    return fail("Internal server error", 500);
  }
}
