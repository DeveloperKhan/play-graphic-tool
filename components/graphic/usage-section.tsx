"use client";

import Image from "next/image";
import type { UsageStats } from "@/lib/types";
import { UsageItem } from "./usage-item";

interface UsageSectionProps {
  usageStats: UsageStats[];
  totalPlayers: number;
}

// SVG dimensions: 1381 x 653
const SVG_WIDTH = 1381;
const SVG_HEIGHT = 653;

export function UsageSection({ usageStats, totalPlayers }: UsageSectionProps) {
  // Split into two rows of 6
  const topRow = usageStats.slice(0, 6);
  const bottomRow = usageStats.slice(6, 12);

  return (
    <div
      style={{
        position: "relative",
        width: SVG_WIDTH,
        height: SVG_HEIGHT,
      }}
    >
      {/* Usage line SVG wrapper */}
      <Image
        src="/assets/graphic/usage-line.svg"
        alt="Top Cut Usage"
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />

      {/* Usage content positioned inside the L-border */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 24,
          display: "flex",
          flexDirection: "column",
          gap: 75, // vertical spacing between rows
        }}
      >
        {/* Top row - 6 Pokemon */}
        <div style={{ display: "flex", gap: 20 }}>
          {topRow.map((stat) => (
            <UsageItem
              key={stat.pokemon}
              pokemonName={stat.pokemon}
              count={stat.count}
              shadowCount={stat.shadowCount}
              totalPlayers={totalPlayers}
            />
          ))}
        </div>

        {/* Bottom row - 6 Pokemon */}
        <div style={{ display: "flex", gap: 20 }}>
          {bottomRow.map((stat) => (
            <UsageItem
              key={stat.pokemon}
              pokemonName={stat.pokemon}
              count={stat.count}
              shadowCount={stat.shadowCount}
              totalPlayers={totalPlayers}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
