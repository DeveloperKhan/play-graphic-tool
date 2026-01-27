// Core type definitions for the tournament graphic generator

export type EventType = "Regional" | "Generic" | "International" | "Worlds";
export type OverviewType = "Usage" | "Bracket" | "None";
export type Placement = 1 | 2 | 3 | 4 | "5-8" | "9-16" | "17-24" | "25-32";

export interface Pokemon {
  id: string; // speciesId from Pokemon data
  isShadow: boolean;
}

export interface Player {
  id: string; // unique player identifier
  placement: Placement;
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

export interface TournamentData {
  eventName: string;
  eventType: EventType;
  overviewType: OverviewType;
  bracketReset: boolean; // Was there a bracket reset in grand finals?
  players: Record<string, Player>; // player lookup by id
  playerOrder: string[]; // ordered list of player ids (for rendering order)
  bracketMatches?: BracketMatch[]; // Manual bracket overrides
}

// Pokemon data from dracoviz.com API
export interface PokemonMetadata {
  speciesName: string;
  speciesId: string;
  sid: number; // Sprite ID for image fetching
}

export interface UsageStats {
  pokemon: string; // speciesName
  count: number; // total usage count
  shadowCount: number; // number of times used as shadow
}
