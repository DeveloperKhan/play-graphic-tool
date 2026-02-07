"use client";

import { useRef, useLayoutEffect, useState } from "react";
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
  const [scale, setScale] = useState(1);
  const textRef = useRef<HTMLSpanElement>(null);

  // Calculate available width based on flag count
  const availableWidth = POKEMON_ROW_WIDTH - (flagCount * FLAG_SIZE + flagCount * GAP);

  useLayoutEffect(() => {
    if (!textRef.current) return;

    // Measure text width at base font size
    const measureSpan = document.createElement("span");
    measureSpan.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: nowrap;
      font-family: Urbane, sans-serif;
      font-weight: 600;
      font-size: ${BASE_FONT_SIZE}px;
    `;
    measureSpan.textContent = name;
    document.body.appendChild(measureSpan);

    const textWidth = measureSpan.offsetWidth;
    document.body.removeChild(measureSpan);

    // Calculate scale needed to fit
    if (textWidth > availableWidth) {
      setScale(availableWidth / textWidth);
    } else {
      setScale(1);
    }
  }, [name, availableWidth]);

  return (
    <span
      ref={textRef}
      style={{
        color: "white",
        fontFamily: "Urbane, sans-serif",
        fontWeight: 600,
        fontSize: BASE_FONT_SIZE,
        whiteSpace: "nowrap",
        transform: `scale(${scale})`,
        transformOrigin: "left center",
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
