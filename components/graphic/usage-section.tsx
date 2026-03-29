"use client";

import type { UsageStats } from "@/lib/types";
import { UsageItem } from "./usage-item";

interface UsageSectionProps {
  usageStats: UsageStats[];
  totalPlayers: number;
}

// No-text SVG dimensions: 1146 x 636
const SVG_WIDTH = 1146;
const SVG_HEIGHT = 636;
const LINE_Y = 4; // Y position of horizontal line in SVG
const LINE_THICKNESS = 4;
const TEXT_GAP = 20; // Gap between end of line and text
const TEXT_FONT_SIZE = 28;

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
      {/* Usage line SVG wrapper - using regular img for export compatibility */}
      <img
        src="/assets/graphic/usage-line-no-text.svg"
        alt="Top Cut Usage"
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />

      {/* Top Cut Usage title - trailing the horizontal line */}
      <span
        style={{
          position: "absolute",
          top: LINE_Y + (LINE_THICKNESS - TEXT_FONT_SIZE) / 2 - 6,
          left: SVG_WIDTH + TEXT_GAP,
          fontFamily: "Urbane, sans-serif",
          fontWeight: 600,
          fontSize: TEXT_FONT_SIZE,
          color: "#FFFFFF",
          whiteSpace: "nowrap",
          lineHeight: 1,
        }}
      >
        Top {totalPlayers} Usage
      </span>

      {/* Usage content positioned inside the L-border */}
      <div
        style={{
          position: "absolute",
          top: 23,
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
