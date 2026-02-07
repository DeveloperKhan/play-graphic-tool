"use client";

import { PlayerCard } from "./player-card";
import type { GraphicPlayer } from "@/lib/graphic-data";

interface PlayerColumnProps {
  title?: string;
  players: GraphicPlayer[];
  startPairIndex?: number;
}

// Colors for the pair rectangles
const PAIR_COLORS = [
  "#DDE06F",
  "#DDE06F",
  "#97FFFF",
  "#97FFFF",
  "#B5FEB0",
  "#B5FEB0",
  "#FF9CD0",
  "#FF9CD0",
];

// Rectangle dimensions
const RECT_WIDTH = 7.33;
const RECT_HEIGHT = 381.17;

export function PlayerColumn({
  title,
  players,
  startPairIndex = 0,
}: PlayerColumnProps) {
  // Group players into pairs
  const pairs: GraphicPlayer[][] = [];
  for (let i = 0; i < players.length; i += 2) {
    pairs.push(players.slice(i, i + 2));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Column header - only show if title is provided */}
      {title && (
        <p
          style={{
            color: "white",
            fontSize: 28,
            fontFamily: "Urbane, sans-serif",
            fontWeight: 600,
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </p>
      )}

      {/* Player pairs with colored rectangles */}
      <div style={{ display: "flex", flexDirection: "column", gap: 53 }}>
        {pairs.map((pair, pairIdx) => {
          const colorIndex = (startPairIndex + pairIdx) % PAIR_COLORS.length;
          const color = PAIR_COLORS[colorIndex];

          return (
            <div
              key={pairIdx}
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: 12,
              }}
            >
              {/* Colored rectangle with rounded left corners */}
              <div
                style={{
                  width: RECT_WIDTH,
                  height: RECT_HEIGHT,
                  backgroundColor: color,
                  borderTopLeftRadius: RECT_WIDTH / 2,
                  borderBottomLeftRadius: RECT_WIDTH / 2,
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  flexShrink: 0,
                }}
              />

              {/* Player cards for this pair */}
              <div style={{ display: "flex", flexDirection: "column", gap: 53 }}>
                {pair.map((player) => (
                  <PlayerCard
                    key={`${player.bracketSide}-${player.group}`}
                    player={player}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
