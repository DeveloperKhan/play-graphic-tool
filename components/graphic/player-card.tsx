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

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
      }}
    >
      <FlagComponent
        style={{
          width: size * 1.5,
          height: size * 1.5,
          marginLeft: -size * 0.25,
          marginTop: -size * 0.25,
        }}
      />
    </div>
  );
}

// Dimensions for 2100x2100 canvas
// Pokemon: 90.88 x 88, Flags: 60x60
const POKEMON_WIDTH = 90.88;
const POKEMON_HEIGHT = 88;

export function PlayerCard({ player }: PlayerCardProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Flag(s) and Player Name */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {player.flags.map((flag) => (
          <FlagIcon key={flag} code={flag} />
        ))}
        <span
          style={{
            color: "white",
            fontWeight: 700,
            fontSize: 32,
          }}
        >
          {player.name}
        </span>
      </div>

      {/* Pokemon Team (6 sprites in a row) */}
      <div style={{ display: "flex", gap: 8 }}>
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
