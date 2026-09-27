/**
 * Challonge Import Utility
 *
 * Pure parsing and standings logic for Challonge v1 API payloads.
 * No network access - the API calls live in app/api/challonge-import/route.ts.
 *
 * Play! Pokemon GO events are two-stage Challonge tournaments:
 * - Group stage (swiss): matches carry a `group_id`, and reference participants
 *   by their `group_player_ids`.
 * - Final stage (top cut): matches have `group_id: null`, and reference
 *   participants by their top-level `id`.
 *
 * Only top-cut players receive a `final_rank`, and ties are real (1,2,3,4,5,5,7,7).
 */

// ============================================================================
// Types
// ============================================================================

export interface ChallongeParticipant {
  id: number;
  group_player_ids: number[];
  display_name: string;
  seed: number;
  final_rank: number | null;
}

export interface ChallongeMatch {
  id: number;
  state: string; // "complete" | "pending" | "open"
  group_id: number | null;
  round: number;
  player1_id: number | null;
  player2_id: number | null;
  winner_id: number | null;
  scores_csv: string;
  identifier: string;
  suggested_play_order: number | null;
}

export interface ChallongeTournament {
  name: string;
  state: string;
  started_at: string | null;
  completed_at: string | null;
}

/** How a standings entry's position was determined */
export type StandingSource = "final_rank" | "swiss" | "pairing";

export interface StandingEntry {
  name: string;
  /** Challonge final_rank for top-cut players, otherwise null */
  rank: number | null;
  seed: number;
  source: StandingSource;
  matchWins: number;
  matchLosses: number;
  gameWins: number;
  gameLosses: number;
}

export type StandingsMode = "final" | "pairings";

export interface StandingsResult {
  mode: StandingsMode;
  /**
   * How many players Challonge assigned a final_rank to (0 in pairings mode).
   * Events run as parallel group brackets rank their whole field, so this can
   * equal the participant count rather than a smaller top cut.
   */
  rankedCount: number;
  /** True when every participant carries a final_rank */
  fullFieldRanked: boolean;
  entries: StandingEntry[];
}

// ============================================================================
// URL Validation
// ============================================================================

/**
 * Validate a Challonge URL and derive the API tournament id.
 *
 * Subdomain-hosted tournaments are addressed as `{subdomain}-{slug}`:
 *   https://pokemongochampionshipseries.challonge.com/2027_GO_Brisbane
 *     -> pokemongochampionshipseries-2027_GO_Brisbane
 *
 * Top-level tournaments use the slug alone:
 *   https://challonge.com/abc123 -> abc123
 */
export function parseChallongeUrl(url: string): {
  valid: boolean;
  tournamentId?: string;
  error?: string;
} {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== "challonge.com" && !hostname.endsWith(".challonge.com")) {
    return { valid: false, error: "URL must be from challonge.com" };
  }

  // First path segment is the tournament slug; ignore trailing pages
  // like /standings, /module, /log
  const slug = parsed.pathname.split("/").filter(Boolean)[0];
  if (!slug) {
    return { valid: false, error: "Missing tournament name in URL" };
  }

  const subdomain = hostname.endsWith(".challonge.com")
    ? hostname.slice(0, -".challonge.com".length)
    : "";

  // www is not an organization subdomain
  if (subdomain && subdomain !== "www") {
    return { valid: true, tournamentId: `${subdomain}-${slug}` };
  }

  return { valid: true, tournamentId: slug };
}

// ============================================================================
// Score Parsing
// ============================================================================

/**
 * Parse a Challonge `scores_csv` value into game counts.
 *
 * Ported from dracobot (commands/generate.js). Challonge encodes a DQ as a
 * negative score, which collides with the "-" separator and produces strings
 * like "0--1" (p1 0, p2 -1) or "-1--1". The original detects these by raw
 * string length, which is preserved here rather than re-derived.
 */
export function parseScoresCsv(scoresCsv: string): {
  p1Games: number;
  p2Games: number;
  dq: boolean;
} {
  let p1Games = 0;
  let p2Games = 0;
  let dq = false;

  for (const score of (scoresCsv || "").split(",")) {
    if (score.length === 5) {
      // "-1--1" - both sides negative
      dq = true;
      p1Games += Number(score.split("-")[1]) * -1;
      p2Games += Number(score.split("-")[3]) * -1;
      continue;
    }

    if (score.length === 4) {
      // "-1-0" or "0--1" - exactly one side negative
      dq = true;
      if (score.split("-")[0] === "") {
        p1Games += Number(score.split("-")[1]) * -1;
        p2Games += Number(score.split("-")[2]);
      } else {
        p1Games += Number(score.split("-")[0]);
        p2Games += Number(score.split("-")[2]) * -1;
      }
      continue;
    }

    p1Games += Number(score.split("-")[0]);
    p2Games += Number(score.split("-")[1]);
  }

  return {
    p1Games: Number.isNaN(p1Games) ? 0 : p1Games,
    p2Games: Number.isNaN(p2Games) ? 0 : p2Games,
    dq,
  };
}

// ============================================================================
// Standings
// ============================================================================

interface PlayerRecord {
  participant: ChallongeParticipant;
  matchWins: number;
  matchLosses: number;
  gameWins: number;
  gameLosses: number;
}

/**
 * Build a lookup from every id a match can reference to its participant.
 * Final-stage matches use `participant.id`; group-stage matches use the
 * ids in `participant.group_player_ids`.
 */
function buildRecordsById(
  participants: ChallongeParticipant[]
): Map<number, PlayerRecord> {
  const byId = new Map<number, PlayerRecord>();

  for (const participant of participants) {
    const record: PlayerRecord = {
      participant,
      matchWins: 0,
      matchLosses: 0,
      gameWins: 0,
      gameLosses: 0,
    };

    byId.set(participant.id, record);
    for (const groupPlayerId of participant.group_player_ids ?? []) {
      byId.set(groupPlayerId, record);
    }
  }

  return byId;
}

/**
 * Accumulate swiss (group stage) match and game records.
 * Mirrors dracobot's accounting in commands/generate.js.
 */
function accumulateGroupRecords(
  matches: ChallongeMatch[],
  byId: Map<number, PlayerRecord>
): void {
  for (const match of matches) {
    if (match.group_id === null) continue;
    if (match.state === "pending") continue;
    if (match.player1_id === null || match.player2_id === null) continue;

    const p1 = byId.get(match.player1_id);
    const p2 = byId.get(match.player2_id);
    if (!p1 || !p2) continue;

    const { p1Games, p2Games, dq } = parseScoresCsv(match.scores_csv);
    const totalGames = p1Games + p2Games;

    const p1Dq = dq && p1Games < p2Games;
    const p2Dq = dq && !p1Dq;

    if (p1Dq) {
      // A DQ costs the match but no game record is meaningful
      p2.matchWins++;
      p1.matchLosses++;
      continue;
    }

    if (p2Dq) {
      p1.matchWins++;
      p2.matchLosses++;
      continue;
    }

    // winner_id is in the same id space as player1_id/player2_id for this match
    if (match.winner_id === match.player1_id) {
      p1.matchWins++;
      p2.matchLosses++;
    } else {
      p2.matchWins++;
      p1.matchLosses++;
    }

    p1.gameWins += p1Games;
    p1.gameLosses += totalGames - p1Games;
    p2.gameWins += p2Games;
    p2.gameLosses += totalGames - p2Games;
  }
}

function toEntry(record: PlayerRecord, source: StandingSource): StandingEntry {
  return {
    name: record.participant.display_name,
    rank: record.participant.final_rank,
    seed: record.participant.seed,
    source,
    matchWins: record.matchWins,
    matchLosses: record.matchLosses,
    gameWins: record.gameWins,
    gameLosses: record.gameLosses,
  };
}

/**
 * Order players by live matchup, so consecutive pairs in the result are real
 * pairings and land on one colored pair line in the graphic.
 *
 * Events are run as parallel double-elimination group brackets (Frankfurt:
 * 4 groups of 28), with an optional small final stage between the group
 * winners. Before that final stage exists, the pairings worth showing are the
 * in-progress matches of the group brackets, so both shapes are handled:
 *
 * 1. Matches that are open (being played now), paired up.
 * 2. Matches still pending with at least one known player - someone waiting on
 *    a result, e.g. a group's losers-bracket finalist.
 * 3. Everyone else, ordered by record, so a larger graphic size still fills.
 */
function buildPairingEntries(
  matches: ChallongeMatch[],
  records: PlayerRecord[],
  byId: Map<number, PlayerRecord>
): StandingEntry[] {
  // A real final stage takes priority: its opening round is the day 2 bracket
  const finalStage = matches.filter(
    (m) => m.group_id === null && (m.player1_id !== null || m.player2_id !== null)
  );

  let pairingMatches: ChallongeMatch[];

  if (finalStage.length > 0) {
    const firstRound = Math.min(...finalStage.map((m) => m.round));
    pairingMatches = finalStage.filter((m) => m.round === firstRound);
  } else {
    pairingMatches = matches.filter(
      (m) =>
        m.state !== "complete" &&
        (m.player1_id !== null || m.player2_id !== null)
    );
  }

  // Matches in progress first, then those still waiting on a player
  const stateRank = (match: ChallongeMatch) => (match.state === "open" ? 0 : 1);

  pairingMatches.sort((a, b) => {
    if (stateRank(a) !== stateRank(b)) return stateRank(a) - stateRank(b);
    if ((a.group_id ?? 0) !== (b.group_id ?? 0)) {
      return (a.group_id ?? 0) - (b.group_id ?? 0);
    }
    const orderA = a.suggested_play_order;
    const orderB = b.suggested_play_order;
    if (orderA !== null && orderB !== null && orderA !== orderB) {
      return orderA - orderB;
    }
    return a.identifier.localeCompare(b.identifier);
  });

  const entries: StandingEntry[] = [];
  const seen = new Set<number>();

  for (const match of pairingMatches) {
    for (const playerId of [match.player1_id, match.player2_id]) {
      if (playerId === null) continue;
      const record = byId.get(playerId);
      if (!record || seen.has(record.participant.id)) continue;
      seen.add(record.participant.id);
      entries.push(toEntry(record, "pairing"));
    }
  }

  // Fill the tail so a larger graphic size is still selectable
  for (const record of sortByRecord(records)) {
    if (seen.has(record.participant.id)) continue;
    seen.add(record.participant.id);
    entries.push(toEntry(record, "swiss"));
  }

  return entries;
}

/**
 * Compute an ordered standings list from Challonge participants and matches.
 *
 * "final" mode: top-cut players ordered by (final_rank, seed), then everyone
 * else by swiss record. Challonge does not expose its official swiss
 * tiebreakers, so entries with source "swiss" are ordered by match record and
 * game differential only and should be treated as approximate.
 *
 * "pairings" mode: nobody has a final_rank yet, so the day 2 bracket is
 * ordered by first-round matchup.
 */
export function computeStandings(
  participants: ChallongeParticipant[],
  matches: ChallongeMatch[]
): StandingsResult {
  const byId = buildRecordsById(participants);
  accumulateGroupRecords(matches, byId);

  // One record per participant (byId holds duplicate keys per player)
  const records = participants
    .map((p) => byId.get(p.id))
    .filter((r): r is PlayerRecord => r !== undefined);

  const topCut = records.filter((r) => r.participant.final_rank !== null);

  if (topCut.length === 0) {
    return {
      mode: "pairings",
      rankedCount: 0,
      fullFieldRanked: false,
      entries: buildPairingEntries(matches, records, byId),
    };
  }

  const topCutIds = new Set(topCut.map((r) => r.participant.id));
  const rest = records.filter((r) => !topCutIds.has(r.participant.id));

  // Challonge hands out tied ranks freely (1,2,3,4,5,5,7,7,9,9,9,9,...).
  // Within a tie, order by bracket record - registration seed says nothing
  // about how a player actually did.
  const rankedEntries = topCut
    .slice()
    .sort((a, b) => {
      const rankDiff =
        (a.participant.final_rank ?? 0) - (b.participant.final_rank ?? 0);
      if (rankDiff !== 0) return rankDiff;
      return compareByRecord(a, b);
    })
    .map((r) => toEntry(r, "final_rank"));

  const swissEntries = sortByRecord(rest).map((r) => toEntry(r, "swiss"));

  return {
    mode: "final",
    rankedCount: topCut.length,
    fullFieldRanked: topCut.length === records.length,
    entries: [...rankedEntries, ...swissEntries],
  };
}

/** Most match wins, then best game differential, then seed as a stable tiebreak */
function compareByRecord(a: PlayerRecord, b: PlayerRecord): number {
  if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
  const diffA = a.gameWins - a.gameLosses;
  const diffB = b.gameWins - b.gameLosses;
  if (diffB !== diffA) return diffB - diffA;
  return a.participant.seed - b.participant.seed;
}

function sortByRecord(records: PlayerRecord[]): PlayerRecord[] {
  return records.slice().sort(compareByRecord);
}
