"use client";

import { PlayerCard } from "./player-card";
import { ColumnWrapper } from "./column-wrapper";
import type { GraphicPlayer } from "@/lib/graphic-data";
import type { ColumnDisplayMode } from "@/lib/types";

interface PlayerColumnProps {
  title?: string;
  players: GraphicPlayer[];
  startPairIndex?: number;
  wrapper?: {
    mode: ColumnDisplayMode;
    text: string;
  };
  /** Whether to reserve space for title when not shown (default: true) */
  reserveTitleSpace?: boolean;
}

// Colors for the pair rectangles
export const PAIR_COLORS = [
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

// Gap between rectangle and players
const RECT_GAP = 12;

// Gap between players
const PLAYER_GAP = 53;

// Total left offset from pair line (used to maintain position when wrapper replaces pair lines)
const PAIR_LINE_OFFSET = RECT_WIDTH + RECT_GAP;

// Title height (fontSize 28 with line-height ~1.4)
const TITLE_HEIGHT = 41;

export function PlayerColumn({
  title,
  players,
  startPairIndex = 0,
  wrapper,
  reserveTitleSpace = true,
}: PlayerColumnProps) {
  // Group players into pairs
  const pairs: GraphicPlayer[][] = [];
  for (let i = 0; i < players.length; i += 2) {
    pairs.push(players.slice(i, i + 2));
  }

  // Get the wrapper color (uses the first pair's color)
  const wrapperColor = PAIR_COLORS[startPairIndex % PAIR_COLORS.length];
  const mode = wrapper?.mode ?? "lines";

  // Hidden mode - render players without any lines or wrapper
  if (mode === "hidden") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Column header - show title or placeholder to maintain spacing */}
        {title ? (
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
        ) : reserveTitleSpace ? (
          <div style={{ height: TITLE_HEIGHT }} />
        ) : null}

        {/* Players without any lines - add margin to maintain alignment */}
        <div style={{ display: "flex", flexDirection: "column", gap: PLAYER_GAP, marginLeft: PAIR_LINE_OFFSET }}>
          {players.map((player, index) => (
            <PlayerCard
              key={`player-${index}`}
              player={player}
            />
          ))}
        </div>
      </div>
    );
  }

  // Wrapper mode - render all players with L-shaped wrapper
  if (mode === "wrapper") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Column header - show title or placeholder to maintain spacing */}
        {title ? (
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
        ) : reserveTitleSpace ? (
          <div style={{ height: TITLE_HEIGHT }} />
        ) : null}

        {/* Wrapped players - no individual pair lines, add margin to match pair line offset */}
        <ColumnWrapper text={wrapper?.text ?? ""} color={wrapperColor}>
          <div style={{ display: "flex", flexDirection: "column", gap: PLAYER_GAP, marginLeft: PAIR_LINE_OFFSET }}>
            {players.map((player, index) => (
              <PlayerCard
                key={`player-${index}`}
                player={player}
              />
            ))}
          </div>
        </ColumnWrapper>
      </div>
    );
  }

  // Lines mode (default) - render with individual pair lines
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Column header - show title or placeholder to maintain spacing */}
      {title ? (
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
      ) : reserveTitleSpace ? (
        <div style={{ height: TITLE_HEIGHT }} />
      ) : null}

      {/* Player pairs with colored rectangles */}
      <div style={{ display: "flex", flexDirection: "column", gap: PLAYER_GAP }}>
        {pairs.map((pair, pairIdx) => {
          const colorIndex = (startPairIndex + pairIdx) % PAIR_COLORS.length;
          const color = PAIR_COLORS[colorIndex];

          return (
            <div
              key={pairIdx}
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: RECT_GAP,
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
              <div style={{ display: "flex", flexDirection: "column", gap: PLAYER_GAP }}>
                {pair.map((player, index) => (
                  <PlayerCard
                    key={`player-${index}`}
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
