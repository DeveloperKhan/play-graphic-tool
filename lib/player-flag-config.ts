/**
 * Player name to flag code mappings
 * Flags are ISO 3166-1 alpha-2 country codes
 * Players can have 1-2 flags
 */

export interface PlayerFlagMapping {
  name: string;
  flags: [string] | [string, string];
}

/**
 * Known player flag mappings
 * Names are case-insensitive for matching
 */
export const PLAYER_FLAG_MAPPINGS: PlayerFlagMapping[] = [
  { name: "DHC United", flags: ["HK"] },
  { name: "SSthorn", flags: ["CO", "CA"] },
  { name: "Jacoloco2", flags: ["CO", "CA"] },
  { name: "610Hero", flags: ["JP"] },
  { name: "MEweedle", flags: ["CH", "GB"] },
  { name: "WooIfpack", flags: ["FR", "SV"] },
  { name: "AdibKhan", flags: ["BA"] },
  { name: "hkassasin", flags: ["HK", "GB"] },
  { name: "LurganRocket", flags: ["IE"] },
  { name: "Jinz", flags: ["AU", "JP"] },
  { name: "Abhinav", flags: ["US", "IN"] },
  { name: "Walker", flags: ["TW"] },
  { name: "Ilqm", flags: ["CR"] },
  { name: "AshtonAsh", flags: ["US", "MX"] },
  { name: "Joeddy12", flags: ["PR"] },
];

/**
 * Look up flags for a player name (case-insensitive)
 * Returns undefined if no mapping found
 */
export function getFlagsForPlayer(name: string): string[] | undefined {
  const normalizedName = name.trim().toLowerCase();
  const mapping = PLAYER_FLAG_MAPPINGS.find(
    (m) => m.name.toLowerCase() === normalizedName
  );
  return mapping?.flags;
}
