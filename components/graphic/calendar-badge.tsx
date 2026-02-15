"use client";

interface CalendarBadgeProps {
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string; // ISO date string (YYYY-MM-DD)
  size?: "default" | "large"; // large is for Bracket mode
}

// Month abbreviations
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function CalendarBadge({ startDate, endDate, size = "default" }: CalendarBadgeProps) {
  // Parse dates using UTC to avoid timezone offset issues
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Get components using UTC methods (use start month regardless of whether range spans months)
  const month = MONTHS[start.getUTCMonth()];
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();

  // Format the date range text
  const dateText = startDay === endDay ? `${startDay}` : `${startDay}-${endDay}`;

  // Size configurations
  const isLarge = size === "large";
  const boxSize = isLarge ? 300 : 187;
  const borderWidth = isLarge ? 10 : 6;
  const monthFontSize = isLarge ? 109 : 68;
  const dayFontSize = isLarge ? 67 : 42;
  const gap = isLarge ? 13 : 8;

  return (
    <div
      style={{
        width: boxSize,
        height: boxSize,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        border: `${borderWidth}px solid white`,
        borderRadius: "5px 0 5px 0",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap,
      }}
    >
      {/* Month */}
      <span
        style={{
          fontFamily: "Urbane, sans-serif",
          fontWeight: 700,
          fontSize: monthFontSize,
          color: "white",
          lineHeight: 1,
          letterSpacing: "0.05em",
        }}
      >
        {month}
      </span>

      {/* Day(s) */}
      <span
        style={{
          fontFamily: "Urbane, sans-serif",
          fontWeight: 600,
          fontSize: dayFontSize,
          color: "#C2C2C2",
          lineHeight: 1,
        }}
      >
        {dateText}
      </span>
    </div>
  );
}
