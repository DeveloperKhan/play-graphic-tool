"use client";

import { CircleFlag } from "react-circle-flags";
import { PokemonSprite } from "./pokemon-sprite";
import type { GraphicPlayer } from "@/lib/graphic-data";

interface PlayerCardProps {
  player: GraphicPlayer;
}

// Flag size for 2100x2100 canvas
const FLAG_SIZE = 60;
const SMALL_FLAG_SIZE = 40; // Size when 2 flags are shown
const PLACEMENT_BADGE_SIZE = 53;

// Placement badge image paths
const PLACEMENT_BADGES: Record<1 | 2 | 3 | 4, string> = {
  1: "/assets/graphic/placements/Type=1st.svg",
  2: "/assets/graphic/placements/Type=2nd.svg",
  3: "/assets/graphic/placements/Type=3rd.svg",
  4: "/assets/graphic/placements/Type=4th.svg",
};

interface FlagDisplayProps {
  flags: string[];
}

function FlagDisplay({ flags }: FlagDisplayProps) {
  if (flags.length === 0) return null;

  // Single flag - render at full size
  if (flags.length === 1) {
    return (
      <CircleFlag
        countryCode={flags[0].toLowerCase()}
        width={FLAG_SIZE}
        height={FLAG_SIZE}
      />
    );
  }

  // Two flags - render within same 60x60 bounding box
  // Flag 1 in top-left, Flag 2 in bottom-right (in front)
  return (
    <div
      style={{
        position: "relative",
        width: FLAG_SIZE,
        height: FLAG_SIZE,
      }}
    >
      {/* Flag 1 - top left, behind */}
      <div style={{ position: "absolute", top: 0, left: 0 }}>
        <CircleFlag
          countryCode={flags[0].toLowerCase()}
          width={SMALL_FLAG_SIZE}
          height={SMALL_FLAG_SIZE}
        />
      </div>
      {/* Flag 2 - bottom right, in front */}
      <div style={{ position: "absolute", bottom: 0, right: 0 }}>
        <CircleFlag
          countryCode={flags[1].toLowerCase()}
          width={SMALL_FLAG_SIZE}
          height={SMALL_FLAG_SIZE}
        />
      </div>
    </div>
  );
}

// Dimensions for 2100x2100 canvas
// Pokemon: 90.88 x 88, Flags: 60x60
const POKEMON_WIDTH = 90.88;
const POKEMON_HEIGHT = 88;
const BASE_FONT_SIZE = 61;
const GAP = 12;

// Calculate available width for name (total Pokemon row width minus flags and gaps)
const POKEMON_ROW_WIDTH = POKEMON_WIDTH * 6 + GAP * 5; // 6 Pokemon with GAP between them

interface DynamicPlayerNameProps {
  name: string;
  flagCount: number;
  hasPlacement: boolean;
}

function DynamicPlayerName({ name, flagCount, hasPlacement }: DynamicPlayerNameProps) {
  // Calculate available width based on flag count and placement badge
  const flagSpace = flagCount * FLAG_SIZE + flagCount * GAP;
  const placementSpace = hasPlacement ? PLACEMENT_BADGE_SIZE + GAP : 0;
  const availableWidth = POKEMON_ROW_WIDTH - flagSpace - placementSpace;

  // Estimate font size based on character count (approximate width per character)
  // This avoids DOM measurement and works reliably with html2canvas-pro
  const estimatedCharWidth = BASE_FONT_SIZE * 0.6; // Approximate width per character
  const estimatedTextWidth = name.length * estimatedCharWidth;

  let fontSize = BASE_FONT_SIZE;
  if (estimatedTextWidth > availableWidth) {
    const scale = availableWidth / estimatedTextWidth;
    fontSize = Math.floor(BASE_FONT_SIZE * scale);
  }

  return (
    <span
      style={{
        color: "white",
        fontFamily: "Urbane, sans-serif",
        fontWeight: 600,
        fontSize: fontSize,
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        height: FLAG_SIZE,
        lineHeight: 1,
      }}
    >
      {name}
    </span>
  );
}

export function PlayerCard({ player }: PlayerCardProps) {
  const hasPlacement = player.placement !== undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 19 }}>
      {/* Flag(s), Player Name, and Placement Badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: GAP,
          width: POKEMON_ROW_WIDTH,
        }}
      >
        <FlagDisplay flags={player.flags} />
        <DynamicPlayerName
          name={player.name}
          flagCount={player.flags.length > 0 ? 1 : 0}
          hasPlacement={hasPlacement}
        />
        {/* Spacer to push badge to the end */}
        <div style={{ flex: 1 }} />
        {/* Placement Badge */}
        {hasPlacement && (
          <img
            src={PLACEMENT_BADGES[player.placement!]}
            alt={`${player.placement}${player.placement === 1 ? "st" : player.placement === 2 ? "nd" : player.placement === 3 ? "rd" : "th"} place`}
            width={PLACEMENT_BADGE_SIZE}
            height={PLACEMENT_BADGE_SIZE}
          />
        )}
      </div>

      {/* Pokemon Team (6 sprites in a row) */}
      <div style={{ display: "flex", gap: GAP }}>
        {player.team.map((pokemon, index) => (
          <PokemonSprite
            key={`${pokemon.name}-${index}`}
            name={pokemon.name}
            isShadow={pokemon.isShadow}
            width={POKEMON_WIDTH}
            height={POKEMON_HEIGHT}
          />
        ))}
      </div>
    </div>
  );
}
