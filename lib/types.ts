// Core type definitions for the tournament graphic generator

export type EventType = "Regional" | "Generic" | "International" | "Worlds";
export type OverviewType = "Usage" | "Bracket" | "None";
export type Placement = 1 | 2 | 3 | 4 | "5-8" | "9-16" | "17-24" | "25-32" | "33-64";

export interface Pokemon {
  id: string; // speciesId from Pokemon data
  isShadow: boolean;
}

export type BracketSide = "Winners" | "Losers";
export type BracketGroup =
  | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H"
  | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P"; // A-H for Top 16, A-P for Top 32

export interface Player {
  id: string; // unique player identifier
  name: string; // player's name
  team: Pokemon[]; // exactly 6
  flags: string[]; // 1-2 ISO country codes (ISO 3166-1 alpha-2)
}

export interface BracketMatch {
  id: string; // unique match identifier
  round: number; // round number in bracket
  isWinnersBracket: boolean; // true for winners bracket, false for losers bracket
  player1Id: string | null; // player id
  player2Id: string | null; // player id
  winnerId: string | null; // player id of winner
  isGrandFinals?: boolean; // true if this is the grand finals match
  isGrandFinalsReset?: boolean; // true if this is the bracket reset match
}

export interface BracketPairing {
  id: string; // unique pairing identifier
  group1: BracketGroup; // First group (e.g., "A")
  group2: BracketGroup; // Second group (e.g., "H")
  description?: string; // Optional description (e.g., "Winners A vs Winners H")
}

export type PlayerCount = 4 | 8 | 16 | 32 | 64;

// Column identifiers for wrapper configuration
// For Top 16: winners1, winners2, losers1, losers2 (4 players each)
// For Top 64: 16 blocks total - each column split into 'a' (top) and 'b' (bottom) for 4 players each
export type ColumnId =
  | "winners1" | "winners2" | "losers1" | "losers2"  // Top 16 (4 columns)
  | "winners1a" | "winners1b" | "winners2a" | "winners2b"  // Top 64 Winners columns 1-2
  | "winners3a" | "winners3b" | "winners4a" | "winners4b"  // Top 64 Winners columns 3-4
  | "losers1a" | "losers1b" | "losers2a" | "losers2b"  // Top 64 Losers columns 1-2
  | "losers3a" | "losers3b" | "losers4a" | "losers4b";  // Top 64 Losers columns 3-4

// Column display modes: lines (default pair lines), wrapper (L-shaped border), hidden (no lines)
export type ColumnDisplayMode = "lines" | "wrapper" | "hidden";

export interface ColumnWrapperConfig {
  mode: ColumnDisplayMode;
  text: string;
}

// Column wrappers - base 4 required for Top 16, additional 16 for Top 64 (4 players per block)
export interface ColumnWrappers {
  // Top 16 columns (4 players each)
  winners1: ColumnWrapperConfig;
  winners2: ColumnWrapperConfig;
  losers1: ColumnWrapperConfig;
  losers2: ColumnWrapperConfig;
  // Top 64 columns - each column split into 'a' (top 4) and 'b' (bottom 4)
  // Winners graphic columns
  winners1a?: ColumnWrapperConfig;
  winners1b?: ColumnWrapperConfig;
  winners2a?: ColumnWrapperConfig;
  winners2b?: ColumnWrapperConfig;
  winners3a?: ColumnWrapperConfig;
  winners3b?: ColumnWrapperConfig;
  winners4a?: ColumnWrapperConfig;
  winners4b?: ColumnWrapperConfig;
  // Losers graphic columns
  losers1a?: ColumnWrapperConfig;
  losers1b?: ColumnWrapperConfig;
  losers2a?: ColumnWrapperConfig;
  losers2b?: ColumnWrapperConfig;
  losers3a?: ColumnWrapperConfig;
  losers3b?: ColumnWrapperConfig;
  losers4a?: ColumnWrapperConfig;
  losers4b?: ColumnWrapperConfig;
}

export interface BracketLabelConfig {
  enabled: boolean;
  text: string;
}

// Bracket positions - maps each bracket cell to a player ID
// For Top 8 double elimination bracket display (21 cells total)
export interface BracketPositions {
  // Winners Semifinals (2 matches = 4 cells)
  winnersSemis1Top: string | null;
  winnersSemis1Bottom: string | null;
  winnersSemis2Top: string | null;
  winnersSemis2Bottom: string | null;

  // Winners Finals (1 match = 2 cells)
  winnersFinalsTop: string | null;
  winnersFinalsBottom: string | null;

  // Losers Round 1 (2 matches = 4 cells)
  losersR1Match1Top: string | null;
  losersR1Match1Bottom: string | null;
  losersR1Match2Top: string | null;
  losersR1Match2Bottom: string | null;

  // Losers Round 2 (2 cells)
  losersR2Top: string | null;
  losersR2Bottom: string | null;

  // Losers Round 3 (2 cells)
  losersR3Top: string | null;
  losersR3Bottom: string | null;

  // Losers Semifinals (1 match = 2 cells)
  losersSemisTop: string | null;
  losersSemisBottom: string | null;

  // Losers Finals (1 match = 2 cells)
  losersFinalsTop: string | null;
  losersFinalsBottom: string | null;

  // Grand Finals (2 cells)
  grandFinalsWinners: string | null;  // Player from winners bracket
  grandFinalsLosers: string | null;   // Player from losers bracket

  // Champion (1 cell)
  champion: string | null;
}

export interface BracketLabels {
  winners: BracketLabelConfig;
  losers: BracketLabelConfig;
}

export interface EventDateRange {
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string; // ISO date string (YYYY-MM-DD)
}

export interface TournamentData {
  titleLines: [string, string, string]; // 3 lines for the title (e.g., ["Las Vegas", "Regional", "Championships"])
  eventYear: string;
  eventType: EventType;
  overviewType: OverviewType;
  playerCount: PlayerCount; // Number of players in tournament
  bracketReset: boolean; // Was there a bracket reset in grand finals?
  players: Record<string, Player>; // player lookup by id
  playerOrder: string[]; // ordered list of player ids (for rendering order)
  bracketPositions?: BracketPositions; // Player assignments for bracket positions (for Bracket mode)
  bracketMatches?: BracketMatch[]; // Manual bracket overrides (for Bracket mode)
  bracketPairings?: BracketPairing[]; // Group pairings (for Usage mode)
  columnWrappers?: ColumnWrappers; // Wrapper config for each column
  bracketLabels?: BracketLabels; // Labels for Winners/Losers bracket headers
  eventDateRange: EventDateRange; // Date range for the event (shown as calendar badge)
}

// Pokemon data from dracoviz.com API
export interface PokemonMetadata {
  speciesName: string;
  speciesId: string;
  sid: number; // Sprite ID for image fetching
  types: string[]; // Pokemon types (e.g., ["ground", "steel"])
}

export interface UsageStats {
  pokemon: string; // speciesName
  count: number; // total usage count
  shadowCount: number; // number of times used as shadow
}
