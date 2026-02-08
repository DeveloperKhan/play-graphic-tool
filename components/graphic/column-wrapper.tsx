"use client";

interface ColumnWrapperProps {
  text: string;
  color: string;
  children: React.ReactNode;
}

// Dimensions for 2100x2100 canvas
const WRAPPER_WIDTH = 468;
const WRAPPER_HEIGHT = 867;
const LINE_THICKNESS = 5.36;
const TEXT_FONT_SIZE = 26;
const TEXT_GAP = 20; // Gap between end of line and text
const LINE_OFFSET_X = 0; // Horizontal gap between line and content
const LINE_OFFSET_Y = -14; // Vertical offset (negative = shift up)
const SHIFT_RIGHT = 3; // Shift wrapper right

/**
 * Column wrapper component that creates an L-shaped border around content
 * Lines are absolutely positioned as overlay - does not affect content layout
 */
export function ColumnWrapper({ text, color, children }: ColumnWrapperProps) {
  // Calculate line positions with shifts
  const lineLeft = -(LINE_THICKNESS + LINE_OFFSET_X) + SHIFT_RIGHT;
  const lineTop = -(LINE_THICKNESS) + LINE_OFFSET_Y;

  return (
    <div style={{ position: "relative" }}>
      {/* Left vertical line - positioned to the left of content */}
      <div
        style={{
          position: "absolute",
          top: LINE_OFFSET_Y,
          left: lineLeft,
          width: LINE_THICKNESS,
          height: WRAPPER_HEIGHT,
          backgroundColor: color,
          borderBottomLeftRadius: LINE_THICKNESS / 2,
        }}
      />

      {/* Top horizontal line - positioned above content */}
      <div
        style={{
          position: "absolute",
          top: lineTop,
          left: lineLeft,
          width: WRAPPER_WIDTH,
          height: LINE_THICKNESS,
          backgroundColor: color,
          borderTopRightRadius: LINE_THICKNESS / 2,
        }}
      />

      {/* Text label - positioned at end of horizontal line, vertically aligned */}
      {text && (
        <span
          style={{
            position: "absolute",
            top: lineTop + (LINE_THICKNESS - TEXT_FONT_SIZE) / 2,
            left: lineLeft + WRAPPER_WIDTH + TEXT_GAP,
            color: "white",
            fontFamily: "Urbane, sans-serif",
            fontWeight: 600, // Demi-Bold
            fontSize: TEXT_FONT_SIZE,
            whiteSpace: "nowrap",
            lineHeight: 1,
          }}
        >
          {text}
        </span>
      )}

      {/* Content - renders in natural position */}
      {children}
    </div>
  );
}
