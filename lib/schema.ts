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

// Column wrappers schema (supports both Top 16 and Top 64)
export const columnWrappersSchema = z.object({
  // Required for Top 16 (4 players per column)
  winners1: columnWrapperConfigSchema,
  winners2: columnWrapperConfigSchema,
  losers1: columnWrapperConfigSchema,
  losers2: columnWrapperConfigSchema,
  // Optional for Top 64 - each column split into 'a' (top 4) and 'b' (bottom 4)
  // Winners graphic columns
  winners1a: columnWrapperConfigSchema.optional(),
  winners1b: columnWrapperConfigSchema.optional(),
  winners2a: columnWrapperConfigSchema.optional(),
  winners2b: columnWrapperConfigSchema.optional(),
  winners3a: columnWrapperConfigSchema.optional(),
  winners3b: columnWrapperConfigSchema.optional(),
  winners4a: columnWrapperConfigSchema.optional(),
  winners4b: columnWrapperConfigSchema.optional(),
  // Losers graphic columns
  losers1a: columnWrapperConfigSchema.optional(),
  losers1b: columnWrapperConfigSchema.optional(),
  losers2a: columnWrapperConfigSchema.optional(),
  losers2b: columnWrapperConfigSchema.optional(),
  losers3a: columnWrapperConfigSchema.optional(),
  losers3b: columnWrapperConfigSchema.optional(),
  losers4a: columnWrapperConfigSchema.optional(),
  losers4b: columnWrapperConfigSchema.optional(),
});

// Bracket label config schema
export const bracketLabelConfigSchema = z.object({
  enabled: z.boolean(),
  text: z.string(),
});

// Bracket labels schema
export const bracketLabelsSchema = z.object({
  winners: bracketLabelConfigSchema,
  losers: bracketLabelConfigSchema,
});

// Event date range schema
export const eventDateRangeSchema = z.object({
  startDate: z.string(), // ISO date string (YYYY-MM-DD)
  endDate: z.string(), // ISO date string (YYYY-MM-DD)
});

// Tournament data schema
export const tournamentSchema = z
  .object({
    titleLines: z.tuple([z.string(), z.string(), z.string()]),
    eventYear: z.string().min(4, "Event year required"),
    eventType: z.enum(["Regional", "Generic", "International", "Worlds"]),
    overviewType: z.enum(["Usage", "Bracket", "None"]),
    playerCount: z.union([z.literal(4), z.literal(8), z.literal(16), z.literal(32), z.literal(64)]),
    bracketReset: z.boolean(),
    players: z.record(z.string(), playerSchema),
    playerOrder: z.array(z.string()),
    bracketMatches: z.array(bracketMatchSchema).optional(),
    bracketPairings: z.array(bracketPairingSchema).optional(),
    columnWrappers: columnWrappersSchema.optional(),
    bracketLabels: bracketLabelsSchema.optional(),
    eventDateRange: eventDateRangeSchema,
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
  );

// Type inference helpers
export type TournamentFormData = z.infer<typeof tournamentSchema>;
export type PlayerFormData = z.infer<typeof playerSchema>;
export type PokemonFormData = z.infer<typeof pokemonSchema>;
