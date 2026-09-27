/**
 * Column display configuration shared by the Column Display form section and
 * the auto-generate import.
 *
 * "Show placements" is a preset rather than a single toggle: it hides the first
 * winners column, switches every other column to wrapper mode with placement
 * text ("1st-4th", "5th-8th", ...), and turns the Winners/Losers bracket labels
 * off. Both entry points build that layout from the tables below.
 */

import type {
  ColumnId,
  ColumnWrapperConfig,
  ColumnWrappers,
  PlayerCount,
} from "./types";

export interface ColumnConfig {
  id: ColumnId;
  label: string;
  colorIndex: number; // Index into PAIR_COLORS
  defaultWrapperText: string; // Default text when wrapper mode is selected
}

// Columns for Top 16
export const COLUMNS_16: ColumnConfig[] = [
  { id: "winners1", label: "Winners Column 1 (A-D)", colorIndex: 0, defaultWrapperText: "1st-4th" },
  { id: "winners2", label: "Winners Column 2 (E-H)", colorIndex: 2, defaultWrapperText: "5th-8th" },
  { id: "losers1", label: "Losers Column 1 (A-D)", colorIndex: 0, defaultWrapperText: "9th-12th" },
  { id: "losers2", label: "Losers Column 2 (E-H)", colorIndex: 2, defaultWrapperText: "13th-16th" },
];

// Columns for Top 32 (8 blocks total - 4 players per block)
export const COLUMNS_32: ColumnConfig[] = [
  { id: "col1a", label: "Column 1 Top (A-B)", colorIndex: 0, defaultWrapperText: "1st-4th" },
  { id: "col1b", label: "Column 1 Bottom (C-D)", colorIndex: 1, defaultWrapperText: "5th-8th" },
  { id: "col2a", label: "Column 2 Top (E-F)", colorIndex: 2, defaultWrapperText: "9th-12th" },
  { id: "col2b", label: "Column 2 Bottom (G-H)", colorIndex: 3, defaultWrapperText: "13th-16th" },
  { id: "col3a", label: "Column 3 Top (I-J)", colorIndex: 0, defaultWrapperText: "17th-20th" },
  { id: "col3b", label: "Column 3 Bottom (K-L)", colorIndex: 1, defaultWrapperText: "21st-24th" },
  { id: "col4a", label: "Column 4 Top (M-N)", colorIndex: 2, defaultWrapperText: "25th-28th" },
  { id: "col4b", label: "Column 4 Bottom (O-P)", colorIndex: 3, defaultWrapperText: "29th-32nd" },
];

// Columns for Top 64 (16 blocks total - 4 players per block)
// Winners graphic (8 blocks: 2 per column x 4 columns)
export const COLUMNS_64_WINNERS: ColumnConfig[] = [
  { id: "winners1a", label: "Winners Col 1 Top (A-B)", colorIndex: 0, defaultWrapperText: "1st-4th" },
  { id: "winners1b", label: "Winners Col 1 Bottom (C-D)", colorIndex: 1, defaultWrapperText: "5th-8th" },
  { id: "winners2a", label: "Winners Col 2 Top (E-F)", colorIndex: 2, defaultWrapperText: "9th-12th" },
  { id: "winners2b", label: "Winners Col 2 Bottom (G-H)", colorIndex: 3, defaultWrapperText: "13th-16th" },
  { id: "winners3a", label: "Winners Col 3 Top (I-J)", colorIndex: 0, defaultWrapperText: "17th-20th" },
  { id: "winners3b", label: "Winners Col 3 Bottom (K-L)", colorIndex: 1, defaultWrapperText: "21st-24th" },
  { id: "winners4a", label: "Winners Col 4 Top (M-N)", colorIndex: 2, defaultWrapperText: "25th-28th" },
  { id: "winners4b", label: "Winners Col 4 Bottom (O-P)", colorIndex: 3, defaultWrapperText: "29th-32nd" },
];

// Losers graphic (8 blocks: 2 per column x 4 columns)
export const COLUMNS_64_LOSERS: ColumnConfig[] = [
  { id: "losers1a", label: "Losers Col 1 Top (A-B)", colorIndex: 0, defaultWrapperText: "1st-4th" },
  { id: "losers1b", label: "Losers Col 1 Bottom (C-D)", colorIndex: 1, defaultWrapperText: "5th-8th" },
  { id: "losers2a", label: "Losers Col 2 Top (E-F)", colorIndex: 2, defaultWrapperText: "9th-12th" },
  { id: "losers2b", label: "Losers Col 2 Bottom (G-H)", colorIndex: 3, defaultWrapperText: "13th-16th" },
  { id: "losers3a", label: "Losers Col 3 Top (I-J)", colorIndex: 0, defaultWrapperText: "17th-20th" },
  { id: "losers3b", label: "Losers Col 3 Bottom (K-L)", colorIndex: 1, defaultWrapperText: "21st-24th" },
  { id: "losers4a", label: "Losers Col 4 Top (M-N)", colorIndex: 2, defaultWrapperText: "25th-28th" },
  { id: "losers4b", label: "Losers Col 4 Bottom (O-P)", colorIndex: 3, defaultWrapperText: "29th-32nd" },
];

export function getFirstWinnersColumnId(playerCount: PlayerCount): ColumnId {
  if (playerCount === 64) return "winners1a";
  if (playerCount === 32) return "col1a";
  return "winners1";
}

export function getRemainingWinnersColumnIds(playerCount: PlayerCount): ColumnId[] {
  if (playerCount === 64) {
    return ["winners1b", "winners2a", "winners2b", "winners3a", "winners3b", "winners4a", "winners4b"];
  }
  if (playerCount === 32) {
    return ["col1b", "col2a", "col2b", "col3a", "col3b", "col4a", "col4b"];
  }
  return ["winners2"];
}

export function getLosersColumnIds(playerCount: PlayerCount): ColumnId[] {
  if (playerCount === 64) {
    return ["losers1a", "losers1b", "losers2a", "losers2b", "losers3a", "losers3b", "losers4a", "losers4b"];
  }
  if (playerCount === 32) return [];
  return ["losers1", "losers2"];
}

export function getAllColumnIds(playerCount: PlayerCount): ColumnId[] {
  return [
    getFirstWinnersColumnId(playerCount),
    ...getRemainingWinnersColumnIds(playerCount),
    ...getLosersColumnIds(playerCount),
  ];
}

export function getDefaultWrapperText(columnId: ColumnId): string {
  const allConfigs = [...COLUMNS_16, ...COLUMNS_32, ...COLUMNS_64_WINNERS, ...COLUMNS_64_LOSERS];
  return allConfigs.find((c) => c.id === columnId)?.defaultWrapperText ?? "";
}

/**
 * Build the complete `columnWrappers` value for the "show placements" layout.
 *
 * Existing text is preserved when `current` is supplied, matching the form
 * section's behaviour of only filling in a wrapper label when it is blank.
 */
export function buildPlacementColumnWrappers(
  playerCount: PlayerCount,
  current?: Partial<Record<ColumnId, ColumnWrapperConfig>>
): ColumnWrappers {
  const wrappers: Partial<Record<ColumnId, ColumnWrapperConfig>> = {};

  const firstColumnId = getFirstWinnersColumnId(playerCount);
  wrappers[firstColumnId] = {
    mode: "hidden",
    text: current?.[firstColumnId]?.text ?? "",
    showPlacements: true,
  };

  for (const columnId of [
    ...getRemainingWinnersColumnIds(playerCount),
    ...getLosersColumnIds(playerCount),
  ]) {
    wrappers[columnId] = {
      mode: "wrapper",
      text: current?.[columnId]?.text || getDefaultWrapperText(columnId),
    };
  }

  // The four Top 16 keys are required by the schema regardless of player count
  for (const columnId of ["winners1", "winners2", "losers1", "losers2"] as const) {
    if (!wrappers[columnId]) {
      wrappers[columnId] = current?.[columnId] ?? { mode: "lines", text: "" };
    }
  }

  return wrappers as ColumnWrappers;
}
