// Core type definitions for the tournament graphic generator

export type EventType = "Regional" | "Generic" | "International" | "Worlds";
export type OverviewType = "Usage" | "Bracket" | "None";
export type Placement = 1 | 2 | 3 | 4 | "5-8" | "9-16" | "17-24" | "25-32";

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

  // For Bracket mode (overviewType === "Bracket")
  placement?: Placement;

  // For Usage mode (overviewType === "Usage")
  bracketSide?: BracketSide; // Winners or Losers
  group?: BracketGroup; // A-P

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

export type PlayerCount = 4 | 8 | 16 | 32;

// Column identifiers for wrapper configuration
export type ColumnId = "winners1" | "winners2" | "losers1" | "losers2";

export interface ColumnWrapperConfig {
  enabled: boolean;
  text: string;
}

export interface TournamentData {
  eventName: string;
  eventYear: string;
  eventType: EventType;
  overviewType: OverviewType;
  playerCount: PlayerCount; // Number of players in tournament
  bracketReset: boolean; // Was there a bracket reset in grand finals?
  players: Record<string, Player>; // player lookup by id
  playerOrder: string[]; // ordered list of player ids (for rendering order)
  bracketMatches?: BracketMatch[]; // Manual bracket overrides (for Bracket mode)
  bracketPairings?: BracketPairing[]; // Group pairings (for Usage mode)
  columnWrappers?: Record<ColumnId, ColumnWrapperConfig>; // Wrapper config for each column
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
