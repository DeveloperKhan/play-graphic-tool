"use client";

interface CalendarBadgeProps {
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string; // ISO date string (YYYY-MM-DD)
}

// Month abbreviations
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function CalendarBadge({ startDate, endDate }: CalendarBadgeProps) {
  // Parse dates using UTC to avoid timezone offset issues
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Get components using UTC methods (use start month regardless of whether range spans months)
  const month = MONTHS[start.getUTCMonth()];
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();

  // Format the date range text
  const dateText = startDay === endDay ? `${startDay}` : `${startDay}-${endDay}`;

  return (
    <div
      style={{
        width: 187,
        height: 187,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        border: "6px solid white",
        borderRadius: "5px 0 5px 0",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* Month */}
      <span
        style={{
          fontFamily: "Urbane, sans-serif",
          fontWeight: 700,
          fontSize: 68,
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
          fontSize: 42,
          color: "#C2C2C2",
          lineHeight: 1,
        }}
      >
        {dateText}
      </span>
    </div>
  );
}
