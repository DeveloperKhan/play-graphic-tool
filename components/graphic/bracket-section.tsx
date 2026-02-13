"use client";

import { BracketCell, BRACKET_CELL_DIMENSIONS } from "./bracket-cell";
import type { Placement } from "@/lib/types";

// Extended player type with placement for bracket display
interface BracketPlayer {
  name: string;
  placement?: Placement;
}

interface BracketSectionProps {
  players: BracketPlayer[];
  bracketReset: boolean;
}

// Container dimensions (matching user spec and SVG viewBox)
const CONTAINER_WIDTH = 1350;
const CONTAINER_HEIGHT = 761;

// Cell dimensions
const CELL_WIDTH = BRACKET_CELL_DIMENSIONS.regular.width; // 327
const CELL_HEIGHT = BRACKET_CELL_DIMENSIONS.regular.height; // 45
const CHAMPION_WIDTH = BRACKET_CELL_DIMENSIONS.champion.width; // 425
const CHAMPION_HEIGHT = BRACKET_CELL_DIMENSIONS.champion.height; // 56

// Color palette for bracket indicators (extracted from SVG)
const COLORS = {
  yellow: "#FDFF7F",
  cyan: "#97FFFF",
  pink: "#FF9CD0",
  purple: "#C9A4FF",
  green: "#B5FEB0",
};

// ============ EXACT POSITIONS FROM SVG ============

// Winners Bracket Round 1 (x=416)
const WINNERS_R1 = [
  { x: 416, y: 0 },    // Match 1 top
  { x: 416, y: 56 },   // Match 1 bottom
  { x: 416, y: 158 },  // Match 2 top
  { x: 416, y: 214 },  // Match 2 bottom
];

// Winners Bracket Semis (x=817)
const WINNERS_SEMIS = [
  { x: 817, y: 78 },   // WS1
  { x: 817, y: 134 },  // WS2
];

// Losers Bracket Round 1 (x=0)
const LOSERS_R1 = [
  { x: 0, y: 377 },    // Match 1 top
  { x: 0, y: 433 },    // Match 1 bottom
  { x: 0, y: 660 },    // Match 2 top
  { x: 0, y: 716 },    // Match 2 bottom
];

// Losers Bracket Round 2 (x=358) - top section
const LOSERS_R2 = [
  { x: 358, y: 349 },  // LR2-1
  { x: 358, y: 405 },  // LR2-2
];

// Losers Bracket Round 3 (x=358) - bottom section
const LOSERS_R3 = [
  { x: 358, y: 632 },  // LR3-1
  { x: 358, y: 688 },  // LR3-2
];

// Losers Bracket Semis (x=567)
const LOSERS_SEMIS = [
  { x: 567, y: 490 },  // LS1
  { x: 567, y: 546 },  // LS2
];

// Losers Finals (x=817)
const LOSERS_FINALS = [
  { x: 817, y: 359 },  // LF1
  { x: 817, y: 415 },  // LF2
];

// Grand Finals area (x=1021)
const GRAND_FINALS = { x: 1021, y: 217 };       // Winner cell (gold when winner)
const GRAND_FINALS_RESET = { x: 1021, y: 273 }; // Loser/Reset cell

// Champion cell (x=923, larger size)
const CHAMPION = { x: 923, y: 632 };

// Reset label position (right of reset cell)
const RESET_LABEL = { x: 1233, y: 332 };

// Section label positions
const SECTION_LABELS = {
  winnersFinals: { x: 873, y: 42 },
  grandFinals: { x: 1178, y: 181 },
  losersFinals: { x: 817, y: 322 },
  champion: { x: 1163, y: 585 },
};

export function BracketSection({ players, bracketReset }: BracketSectionProps) {
  // Map players by placement
  const champion = players.find((p) => p.placement === 1);
  const runnerUp = players.find((p) => p.placement === 2);
  const thirdPlace = players.find((p) => p.placement === 3);
  const fourthPlace = players.find((p) => p.placement === 4);
  const fifthToEighth = players.filter((p) => p.placement === "5-8");

  // Determine visibility states
  const hasWinner = !!champion;

  // Assign 5-8 players to bracket positions (first 4 in order)
  const [fifth1, fifth2, fifth3, fifth4] = fifthToEighth;

  return (
    <div
      style={{
        position: "relative",
        width: CONTAINER_WIDTH,
        height: CONTAINER_HEIGHT,
      }}
    >
      {/* ============ BRACKET LINES ============ */}
      {/* Using SVG file for bracket lines */}
      <img
        src="/assets/graphic/bracket-lines.svg"
        alt=""
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: CONTAINER_WIDTH,
          height: CONTAINER_HEIGHT,
          pointerEvents: "none",
        }}
      />

      {/* ============ SECTION LABELS ============ */}

      {/* Winners Finals label */}
      <SectionLabel x={SECTION_LABELS.winnersFinals.x} y={SECTION_LABELS.winnersFinals.y}>
        Winners Finals
      </SectionLabel>

      {/* Grand Finals label */}
      <SectionLabel x={SECTION_LABELS.grandFinals.x} y={SECTION_LABELS.grandFinals.y}>
        Grand Finals
      </SectionLabel>

      {/* Losers Finals label */}
      <SectionLabel x={SECTION_LABELS.losersFinals.x} y={SECTION_LABELS.losersFinals.y}>
        Losers Finals
      </SectionLabel>

      {/* Champion label */}
      {hasWinner && (
        <SectionLabel x={SECTION_LABELS.champion.x} y={SECTION_LABELS.champion.y} fontSize={34}>
          Champion
        </SectionLabel>
      )}

      {/* ============ BRACKET CELLS ============ */}

      {/* Winners Round 1 - each pairing has unique color */}
      <BracketCell
        x={WINNERS_R1[0].x}
        y={WINNERS_R1[0].y}
        playerName={fifth1?.name}
        borderColor={COLORS.yellow}
      />
      <BracketCell
        x={WINNERS_R1[1].x}
        y={WINNERS_R1[1].y}
        playerName={fifth2?.name}
        borderColor={COLORS.yellow}
      />
      <BracketCell
        x={WINNERS_R1[2].x}
        y={WINNERS_R1[2].y}
        playerName={fifth3?.name}
        borderColor={COLORS.cyan}
      />
      <BracketCell
        x={WINNERS_R1[3].x}
        y={WINNERS_R1[3].y}
        playerName={fifth4?.name}
        borderColor={COLORS.cyan}
      />

      {/* Winners Semis (Winners Finals) - both cells have purple */}
      <BracketCell
        x={WINNERS_SEMIS[0].x}
        y={WINNERS_SEMIS[0].y}
        borderColor={COLORS.purple}
      />
      <BracketCell
        x={WINNERS_SEMIS[1].x}
        y={WINNERS_SEMIS[1].y}
        borderColor={COLORS.purple}
      />

      {/* Losers Round 1 - each pairing has unique color */}
      <BracketCell
        x={LOSERS_R1[0].x}
        y={LOSERS_R1[0].y}
        borderColor={COLORS.green}
      />
      <BracketCell
        x={LOSERS_R1[1].x}
        y={LOSERS_R1[1].y}
        borderColor={COLORS.green}
      />
      <BracketCell
        x={LOSERS_R1[2].x}
        y={LOSERS_R1[2].y}
        borderColor={COLORS.pink}
      />
      <BracketCell
        x={LOSERS_R1[3].x}
        y={LOSERS_R1[3].y}
        borderColor={COLORS.pink}
      />

      {/* Losers Round 2 - top cell only, cyan (from Winners R1 match 2 dropout) */}
      <BracketCell
        x={LOSERS_R2[0].x}
        y={LOSERS_R2[0].y}
        borderColor={COLORS.cyan}
      />
      <BracketCell
        x={LOSERS_R2[1].x}
        y={LOSERS_R2[1].y}
      />

      {/* Losers Round 3 - top cell only, yellow (from Winners R1 match 1 dropout) */}
      <BracketCell
        x={LOSERS_R3[0].x}
        y={LOSERS_R3[0].y}
        borderColor={COLORS.yellow}
      />
      <BracketCell
        x={LOSERS_R3[1].x}
        y={LOSERS_R3[1].y}
      />

      {/* Losers Semis - no colored borders */}
      <BracketCell
        x={LOSERS_SEMIS[0].x}
        y={LOSERS_SEMIS[0].y}
        playerName={fourthPlace?.name}
      />
      <BracketCell
        x={LOSERS_SEMIS[1].x}
        y={LOSERS_SEMIS[1].y}
      />

      {/* Losers Finals - only top cell has colored border matching winner's final */}
      <BracketCell
        x={LOSERS_FINALS[0].x}
        y={LOSERS_FINALS[0].y}
        playerName={thirdPlace?.name}
        borderColor={COLORS.purple}
      />
      <BracketCell
        x={LOSERS_FINALS[1].x}
        y={LOSERS_FINALS[1].y}
      />

      {/* Grand Finals Winner */}
      <BracketCell
        x={GRAND_FINALS.x}
        y={GRAND_FINALS.y}
        playerName={hasWinner ? champion?.name : undefined}
        isGoldBackground={hasWinner}
      />

      {/* Grand Finals Loser / Reset */}
      <BracketCell
        x={GRAND_FINALS_RESET.x}
        y={GRAND_FINALS_RESET.y}
        playerName={runnerUp?.name}
      />

      {/* Reset label (conditional) */}
      {bracketReset && (
        <span
          style={{
            position: "absolute",
            left: RESET_LABEL.x,
            top: RESET_LABEL.y,
            fontFamily: "Urbane, sans-serif",
            fontWeight: 600,
            fontSize: 20,
            color: "rgba(255, 255, 255, 0.7)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ResetIcon />
          Reset
        </span>
      )}

      {/* Champion Cell */}
      <BracketCell
        x={CHAMPION.x}
        y={CHAMPION.y}
        playerName={champion?.name}
        isChampion
        isGoldBackground={hasWinner}
        hidden={!hasWinner}
      />
    </div>
  );
}

// Section label component
interface SectionLabelProps {
  x: number;
  y: number;
  fontSize?: number;
  children: React.ReactNode;
}

function SectionLabel({ x, y, fontSize = 26, children }: SectionLabelProps) {
  return (
    <span
      style={{
        position: "absolute",
        left: x,
        top: y,
        fontFamily: "Urbane, sans-serif",
        fontWeight: 600,
        fontSize,
        color: "white",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// Reset icon component
function ResetIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
