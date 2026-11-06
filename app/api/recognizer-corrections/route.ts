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
 *   POST  multipart: "labels" (a CorrectionSubmission) and its team-<n>.jpg panels
 *
 * Needs CORRECTIONS_GITHUB_TOKEN (fine-grained, Contents read/write on that repo only) and
 * CORRECTIONS_REPO ("owner/name"); CORRECTIONS_BRANCH defaults to main.
 */

const MAX_TEAMS = 16;
const MAX_IMAGE_BYTES = 1_500_000;
const SPECIES_ID = /^[a-z0-9_]{0,64}$/;

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

/** Shape checks; the maintainer's review is what decides whether a submission trains. */
function validate(submission: CorrectionSubmission, known: Set<string> | null): string | null {
  if (submission?.format !== CORRECTIONS_FORMAT) return "Unsupported corrections format";
  if (!Array.isArray(submission.teams) || submission.teams.length === 0 || submission.teams.length > MAX_TEAMS) {
    return `Expected 1 to ${MAX_TEAMS} teams`;
  }
  if (!isText(submission.event?.challongeUrl, 300) || !isText(submission.event?.name, 200)) return "Bad event";
  for (const [i, team] of submission.teams.entries()) {
    if (team.image !== `team-${i}.jpg`) return `Team ${i}: unexpected image name`;
    if (!isText(team.read, 64) || !isText(team.dracovizName, 64) || !isText(team.source, 300)) {
      return `Team ${i}: bad names`;
    }
    if (!isText(team.player?.name, 64) || !isText(team.player?.challongeName, 64)) return `Team ${i}: bad player`;
    if (team.nameBox !== null && !isBox(team.nameBox)) return `Team ${i}: bad name box`;
    if (!Array.isArray(team.slots) || team.slots.length !== 6) return `Team ${i}: expected six slots`;
    for (const slot of team.slots) {
      const ids = [slot.speciesId, slot.predicted?.speciesId];
      if (ids.some((id) => typeof id !== "string" || !SPECIES_ID.test(id))) return `Team ${i}: bad species id`;
      if (known && slot.speciesId && !known.has(slot.speciesId)) return `Team ${i}: unknown species ${slot.speciesId}`;
      if (typeof slot.shadow !== "boolean" || typeof slot.edited !== "boolean" || !isBox(slot.box)) {
        return `Team ${i}: bad slot`;
      }
      const confidence = slot.predicted?.confidence;
      if (typeof confidence !== "number" || confidence < 0 || confidence > 1) return `Team ${i}: bad confidence`;
    }
  }
  return null;
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
  const invalid = validate(submission, known);
  if (invalid) return fail(invalid);

  const files: Array<{ path: string; content: Uint8Array }> = [];
  const date = new Date().toISOString().slice(0, 10);
  const folder = `corrections/inbox/${date}-${eventSlug(submission.event.challongeUrl)}-${randomBytes(3).toString("hex")}`;
  for (const team of submission.teams) {
    const file = form.get(team.image);
    if (!(file instanceof Blob)) return fail(`Missing ${team.image}`);
    if (file.size > MAX_IMAGE_BYTES) return fail(`${team.image} is too large`);
    const content = new Uint8Array(await file.arrayBuffer());
    if (content[0] !== 0xff || content[1] !== 0xd8 || content[2] !== 0xff) return fail(`${team.image} isn't a JPEG`);
    files.push({ path: `${folder}/${team.image}`, content });
  }
  const labels = { ...submission, receivedAt: new Date().toISOString() };
  files.push({ path: `${folder}/labels.json`, content: new TextEncoder().encode(JSON.stringify(labels, null, 2) + "\n") });

  const edited = submission.teams.reduce((n, t) => n + t.slots.filter((s) => s.edited).length, 0);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  try {
    const { commit } = await commitFiles(
      repo,
      files,
      `Add ${plural(submission.teams.length, "team")} (${plural(edited, "corrected tile")}) from ${
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
