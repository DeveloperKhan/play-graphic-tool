"use client";

import { useEffect, useState } from "react";
import { getSpriteByName } from "@/lib/pokemon-sprites";

interface PokemonSpriteProps {
  name: string;
  isShadow: boolean;
  width?: number;
  height?: number;
}

// Default dimensions for player Pokemon on 2100x2100 canvas: 90.88 x 88
export function PokemonSprite({
  name,
  isShadow,
  width = 90.88,
  height = 88,
}: PokemonSpriteProps) {
  const [spriteUrl, setSpriteUrl] = useState<string>("");

  useEffect(() => {
    getSpriteByName(name).then(setSpriteUrl);
  }, [name]);

  // Shadow icon dimensions for player Pokemon
  const shadowIconWidth = 48.5;
  const shadowIconHeight = 54.38;

  return (
    <div style={{ position: "relative", width, height }}>
      {/* Oval container with white border */}
      <div
        style={{
          width,
          height,
          borderRadius: "50%",
          overflow: "hidden",
          border: "2px solid white",
          backgroundColor: "#C1D4FF",
        }}
      >
        {spriteUrl ? (
          <img
            src={spriteUrl}
            alt={name}
            width={width}
            height={height}
            style={{
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
            }}
          />
        )}
      </div>
      {/* Shadow icon overlay */}
      {isShadow && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: shadowIconWidth,
            height: shadowIconHeight,
          }}
        >
          <img
            src="/assets/shadow_icon.png"
            alt="Shadow"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </div>
      )}
    </div>
  );
}
