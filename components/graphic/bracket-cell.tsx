"use client";

// Cell dimensions
const REGULAR_WIDTH = 327;
const REGULAR_HEIGHT = 45;
const CHAMPION_WIDTH = 425;
const CHAMPION_HEIGHT = 56;

// Colors
const REGULAR_BG = "rgba(255, 255, 255, 0.2)";
const GOLD_BG = "#FDE6A3";

// Border width for color indicator
const BORDER_WIDTH = 12;

interface BracketCellProps {
  playerName?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  isChampion?: boolean;
  isGoldBackground?: boolean;
  borderColor?: string;
  hidden?: boolean;
}

export function BracketCell({
  playerName,
  x,
  y,
  width,
  height,
  isChampion = false,
  isGoldBackground = false,
  borderColor,
  hidden = false,
}: BracketCellProps) {
  if (hidden) return null;

  const cellWidth = width ?? (isChampion ? CHAMPION_WIDTH : REGULAR_WIDTH);
  const cellHeight = height ?? (isChampion ? CHAMPION_HEIGHT : REGULAR_HEIGHT);
  const bgColor = isGoldBackground ? GOLD_BG : REGULAR_BG;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: cellWidth,
        height: cellHeight,
        backgroundColor: bgColor,
        display: "flex",
        alignItems: "center",
        justifyContent: isChampion ? "center" : "flex-start",
        paddingLeft: isChampion ? 0 : 8,
        paddingRight: isChampion ? 0 : 16,
        boxSizing: "border-box",
        borderTopLeftRadius: 5,
        borderBottomRightRadius: 5,
        borderLeft: borderColor ? `${BORDER_WIDTH}px solid ${borderColor}` : undefined,
      }}
    >
      {/* Player name */}
      {playerName && (
        <span
          style={{
            fontFamily: "Urbane, sans-serif",
            fontWeight: 600, // Demi-Bold
            fontSize: isChampion ? 39 : 28,
            color: isGoldBackground ? "#1a1a1a" : "white",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {playerName}
        </span>
      )}
    </div>
  );
}

// Export constants for use in BracketSection
export const BRACKET_CELL_DIMENSIONS = {
  regular: { width: REGULAR_WIDTH, height: REGULAR_HEIGHT },
  champion: { width: CHAMPION_WIDTH, height: CHAMPION_HEIGHT },
};
