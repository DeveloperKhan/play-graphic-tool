import { z } from "zod";

// Pokemon schema
export const pokemonSchema = z.object({
  id: z.string().min(1, "Pokemon ID required"),
  isShadow: z.boolean().default(false),
});

// Player schema
export const playerSchema = z.object({
  id: z.string().min(1, "Player ID required"),
  placement: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal("5-8"),
    z.literal("9-16"),
    z.literal("17-24"),
    z.literal("25-32"),
  ]),
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

// Tournament data schema
export const tournamentSchema = z
  .object({
    eventName: z.string().min(1, "Event name required"),
    eventType: z.enum(["Regional", "Generic", "International", "Worlds"]),
    overviewType: z.enum(["Usage", "Bracket", "None"]),
    bracketReset: z.boolean().default(false),
    players: z.record(z.string(), playerSchema),
    playerOrder: z.array(z.string()),
    bracketMatches: z.array(bracketMatchSchema).optional(),
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
      // Validate placement distribution based on player count
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
  );

// Type inference helpers
export type TournamentFormData = z.infer<typeof tournamentSchema>;
export type PlayerFormData = z.infer<typeof playerSchema>;
export type PokemonFormData = z.infer<typeof pokemonSchema>;
