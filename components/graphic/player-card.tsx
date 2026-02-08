"use client";

import { PokemonSprite } from "./pokemon-sprite";
import type { GraphicPlayer } from "@/lib/graphic-data";

// Flag components from country-flag-icons
import * as Flags from "country-flag-icons/react/3x2";

interface PlayerCardProps {
  player: GraphicPlayer;
}

// Type for flag component lookup
type FlagCode = keyof typeof Flags;

// Flag size for 2100x2100 canvas: 60x60, no border
function FlagIcon({ code }: { code: string }) {
  const size = 60;
  const FlagComponent = Flags[code.toUpperCase() as FlagCode];

  if (!FlagComponent) {
    // Fallback for unknown flag codes
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: "#9ca3af",
        }}
      />
    );
  }

  // Use absolute positioning to center flag within circle (html2canvas-pro doesn't handle negative margins well)
  const flagSize = size * 1.5;
  const offset = (flagSize - size) / 2;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -offset,
          left: -offset,
          width: flagSize,
          height: flagSize,
        }}
      >
        <FlagComponent
          style={{
            width: "100%",
            height: "100%",
          }}
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
const FLAG_SIZE = 60;
const GAP = 12;

// Calculate available width for name (total Pokemon row width minus flags and gaps)
const POKEMON_ROW_WIDTH = POKEMON_WIDTH * 6 + GAP * 5; // 6 Pokemon with GAP between them

interface DynamicPlayerNameProps {
  name: string;
  flagCount: number;
}

function DynamicPlayerName({ name, flagCount }: DynamicPlayerNameProps) {
  // Calculate available width based on flag count
  const availableWidth = POKEMON_ROW_WIDTH - (flagCount * FLAG_SIZE + flagCount * GAP);

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
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 19 }}>
      {/* Flag(s) and Player Name */}
      <div style={{ display: "flex", alignItems: "center", gap: GAP }}>
        {player.flags.map((flag) => (
          <FlagIcon key={flag} code={flag} />
        ))}
        <DynamicPlayerName name={player.name} flagCount={player.flags.length} />
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
