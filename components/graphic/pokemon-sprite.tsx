"use client";

import Image from "next/image";
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

  const shadowSize = Math.min(width, height) * 0.35;

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
          <Image
            src={spriteUrl}
            alt={name}
            width={width}
            height={height}
            style={{
              objectFit: "cover",
            }}
            unoptimized
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
            width: shadowSize,
            height: shadowSize,
          }}
        >
          <Image
            src="/assets/shadow_icon.png"
            alt="Shadow"
            fill
            style={{ objectFit: "contain" }}
          />
        </div>
      )}
    </div>
  );
}
