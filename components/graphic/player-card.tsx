"use client";

import { PokemonSprite } from "./pokemon-sprite";
import type { GraphicPlayer } from "@/lib/graphic-data";

// Flag components from country-flag-icons
import * as Flags from "country-flag-icons/react/3x2";

interface PlayerCardProps {
  player: GraphicPlayer;
  compact?: boolean;
}

// Type for flag component lookup
type FlagCode = keyof typeof Flags;

function FlagIcon({ code, size = 24 }: { code: string; size?: number }) {
  const FlagComponent = Flags[code.toUpperCase() as FlagCode];

  if (!FlagComponent) {
    // Fallback for unknown flag codes
    return (
      <div
        className="bg-gray-400 rounded-sm"
        style={{ width: size * 1.5, height: size }}
      />
    );
  }

  return (
    <FlagComponent
      style={{ width: size * 1.5, height: size }}
      className="rounded-sm shadow-sm"
    />
  );
}

export function PlayerCard({ player, compact = false }: PlayerCardProps) {
  const spriteSize = compact ? 32 : 40;
  const flagSize = compact ? 16 : 20;

  return (
    <div className="flex flex-col gap-1">
      {/* Flag(s) and Player Name */}
      <div className="flex items-center gap-2">
        {player.flags.map((flag) => (
          <FlagIcon key={flag} code={flag} size={flagSize} />
        ))}
        <span
          className={`text-white font-bold ${compact ? "text-sm" : "text-base"}`}
        >
          {player.name}
        </span>
      </div>

      {/* Pokemon Team (6 sprites in a row) */}
      <div className="flex gap-1">
        {player.team.map((pokemon, index) => (
          <PokemonSprite
            key={`${pokemon.name}-${index}`}
            name={pokemon.name}
            isShadow={pokemon.isShadow}
            size={spriteSize}
          />
        ))}
      </div>
    </div>
  );
}
