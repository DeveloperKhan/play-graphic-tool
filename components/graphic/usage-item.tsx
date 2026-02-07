"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getSpriteByName } from "@/lib/pokemon-sprites";

interface UsageItemProps {
  pokemonName: string;
  count: number;
  shadowCount: number;
  totalPlayers: number;
}

// Dimensions for 2100x2100 canvas: 209.44 x 200 (oval)
const SPRITE_WIDTH = 209.44;
const SPRITE_HEIGHT = 200;
const SHADOW_ICON_WIDTH = 111.78;
const SHADOW_ICON_HEIGHT = 123.6;

export function UsageItem({
  pokemonName,
  count,
  shadowCount,
  totalPlayers,
}: UsageItemProps) {
  const [spriteUrl, setSpriteUrl] = useState<string>("");

  useEffect(() => {
    getSpriteByName(pokemonName).then(setSpriteUrl);
  }, [pokemonName]);

  const percentage = ((count / totalPlayers) * 100).toFixed(1);
  const isAllShadow = shadowCount === count && shadowCount > 0;
  const hasMixedShadow = shadowCount > 0 && shadowCount < count;
  const shadowPercentage = hasMixedShadow
    ? ((shadowCount / count) * 100).toFixed(0)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Pokemon sprite container - oval with white border */}
      <div style={{ position: "relative", width: SPRITE_WIDTH, height: SPRITE_HEIGHT }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            overflow: "hidden",
            border: "3px solid white",
            backgroundColor: "#C1D4FF",
          }}
        >
          {spriteUrl ? (
            <Image
              src={spriteUrl}
              alt={pokemonName}
              width={SPRITE_WIDTH}
              height={SPRITE_HEIGHT}
              style={{ objectFit: "cover" }}
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

        {/* Shadow icon overlay (if all shadow) */}
        {isAllShadow && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: SHADOW_ICON_WIDTH,
              height: SHADOW_ICON_HEIGHT,
            }}
          >
            <Image
              src="/assets/shadow_icon.png"
              alt="Shadow"
              width={SHADOW_ICON_WIDTH}
              height={SHADOW_ICON_HEIGHT}
              style={{ objectFit: "contain" }}
            />
          </div>
        )}
      </div>

      {/* Usage percentage */}
      <div
        style={{
          marginTop: 8,
          width: SPRITE_WIDTH,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <span style={{ color: "white", fontSize: 34, fontWeight: 700 }}>
          {percentage}%
        </span>

        {/* Shadow percentage (if mixed) - centered with Pokemon image */}
        {hasMixedShadow && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              color: "white",
              fontSize: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              marginTop: 4,
              whiteSpace: "nowrap",
            }}
          >
            <Image
              src="/assets/shadow_icon.png"
              alt="Shadow"
              width={26.54}
              height={30}
              style={{ display: "inline-block" }}
            />
            {shadowPercentage}%
          </div>
        )}
      </div>
    </div>
  );
}
