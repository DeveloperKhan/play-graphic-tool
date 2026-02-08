import { z } from "zod";

// Pokemon schema
export const pokemonSchema = z.object({
  id: z.string(),
  isShadow: z.boolean(),
});

// Player schema
export const playerSchema = z.object({
  id: z.string().min(1, "Player ID required"),
  name: z.string().min(1, "Player name required"),
  // For Bracket mode
  placement: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal("5-8"),
    z.literal("9-16"),
    z.literal("17-24"),
    z.literal("25-32"),
  ]).optional(),
  // For Usage mode
  bracketSide: z.enum(["Winners", "Losers"]).optional(),
  group: z.enum(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"]).optional(),
  team: z
    .array(pokemonSchema)
    .length(6, "Team must have exactly 6 Pokemon"),
  flags: z
    .array(z.string().length(2, "Flag must be 2-letter country code"))
    .min(1, "At least 1 flag required")
    .max(2, "Maximum 2 flags allowed"),
});

// Bracket match schema
export const bracketMatchSchema = z.object({
  id: z.string(),
  round: z.number().int().positive(),
  isWinnersBracket: z.boolean(),
  player1Id: z.string().nullable(),
  player2Id: z.string().nullable(),
  winnerId: z.string().nullable(),
  isGrandFinals: z.boolean().optional(),
  isGrandFinalsReset: z.boolean().optional(),
});

// Bracket pairing schema
export const bracketPairingSchema = z.object({
  id: z.string(),
  group1: z.enum(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"]),
  group2: z.enum(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"]),
  description: z.string().optional(),
});

// Column wrapper config schema
export const columnWrapperConfigSchema = z.object({
  mode: z.enum(["lines", "wrapper", "hidden"]),
  text: z.string(),
});

// Column wrappers schema
export const columnWrappersSchema = z.object({
  winners1: columnWrapperConfigSchema,
  winners2: columnWrapperConfigSchema,
  losers1: columnWrapperConfigSchema,
  losers2: columnWrapperConfigSchema,
});

// Tournament data schema
export const tournamentSchema = z
  .object({
    eventName: z.string().min(1, "Event name required"),
    eventYear: z.string().min(4, "Event year required"),
    eventType: z.enum(["Regional", "Generic", "International", "Worlds"]),
    overviewType: z.enum(["Usage", "Bracket", "None"]),
    playerCount: z.union([z.literal(4), z.literal(8), z.literal(16), z.literal(32)]),
    bracketReset: z.boolean(),
    players: z.record(z.string(), playerSchema),
    playerOrder: z.array(z.string()),
    bracketMatches: z.array(bracketMatchSchema).optional(),
    bracketPairings: z.array(bracketPairingSchema).optional(),
    columnWrappers: columnWrappersSchema.optional(),
  })
  .refine(
    (data) => {
      // Validate that playerOrder matches players keys
      const playerIds = Object.keys(data.players);
      return (
        data.playerOrder.length === playerIds.length &&
        data.playerOrder.every((id) => playerIds.includes(id))
      );
    },
    {
      message: "playerOrder must match player IDs in players record",
    }
  )
  .refine(
    (data) => {
      // Validate that player count matches number of players
      const actualPlayerCount = Object.keys(data.players).length;
      return actualPlayerCount === data.playerCount;
    },
    {
      message: "Number of players must match selected tournament size",
    }
  )
  .refine(
    (data) => {
      // Validate placement distribution based on player count (only for Bracket mode)
      if (data.overviewType !== "Bracket") {
        return true; // Skip validation for non-Bracket modes
      }

      const players = Object.values(data.players);
      const placements = players.map((p) => p.placement);

      const counts = {
        "1": placements.filter((p) => p === 1).length,
        "2": placements.filter((p) => p === 2).length,
        "3": placements.filter((p) => p === 3).length,
        "4": placements.filter((p) => p === 4).length,
        "5-8": placements.filter((p) => p === "5-8").length,
        "9-16": placements.filter((p) => p === "9-16").length,
        "17-24": placements.filter((p) => p === "17-24").length,
        "25-32": placements.filter((p) => p === "25-32").length,
      };

      const playerCount = players.length;

      // Top 4: 1st, 2nd, 3rd, 4th
      if (playerCount === 4) {
        return (
          counts["1"] === 1 &&
          counts["2"] === 1 &&
          counts["3"] === 1 &&
          counts["4"] === 1 &&
          counts["5-8"] === 0 &&
          counts["9-16"] === 0 &&
          counts["17-24"] === 0 &&
          counts["25-32"] === 0
        );
      }

      // Top 8: 1st, 2nd, 3rd, 4th, 4x 5-8
      if (playerCount === 8) {
        return (
          counts["1"] === 1 &&
          counts["2"] === 1 &&
          counts["3"] === 1 &&
          counts["4"] === 1 &&
          counts["5-8"] === 4 &&
          counts["9-16"] === 0 &&
          counts["17-24"] === 0 &&
          counts["25-32"] === 0
        );
      }

      // Top 16: 1st, 2nd, 3rd, 4th, 4x 5-8, 8x 9-16
      if (playerCount === 16) {
        return (
          counts["1"] === 1 &&
          counts["2"] === 1 &&
          counts["3"] === 1 &&
          counts["4"] === 1 &&
          counts["5-8"] === 4 &&
          counts["9-16"] === 8 &&
          counts["17-24"] === 0 &&
          counts["25-32"] === 0
        );
      }

      // Top 32: 1st, 2nd, 3rd, 4th, 4x 5-8, 8x 9-16, 8x 17-24, 8x 25-32
      if (playerCount === 32) {
        return (
          counts["1"] === 1 &&
          counts["2"] === 1 &&
          counts["3"] === 1 &&
          counts["4"] === 1 &&
          counts["5-8"] === 4 &&
          counts["9-16"] === 8 &&
          counts["17-24"] === 8 &&
          counts["25-32"] === 8
        );
      }

      return false; // Invalid player count
    },
    {
      message:
        "Invalid placement distribution for player count (must be 4, 8, 16, or 32)",
    }
  )
  .refine(
    (data) => {
      // If Bracket mode, all players must have placement
      if (data.overviewType === "Bracket") {
        const players = Object.values(data.players);
        return players.every((player) => player.placement !== undefined);
      }
      return true;
    },
    {
      message: "In Bracket mode, all players must have a placement",
    }
  )
  .refine(
    (data) => {
      // If Usage mode, all players must have bracketSide and group
      if (data.overviewType === "Usage") {
        const players = Object.values(data.players);
        return players.every(
          (player) => player.bracketSide !== undefined && player.group !== undefined
        );
      }
      return true;
    },
    {
      message: "In Usage mode, all players must have a bracket side and group",
    }
  );

// Type inference helpers
export type TournamentFormData = z.infer<typeof tournamentSchema>;
export type PlayerFormData = z.infer<typeof playerSchema>;
export type PokemonFormData = z.infer<typeof pokemonSchema>;
