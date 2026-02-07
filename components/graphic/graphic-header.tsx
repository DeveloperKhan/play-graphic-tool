"use client";

import { useLayoutEffect, useRef, useState } from "react";

interface GraphicHeaderProps {
  eventName: string;
  eventYear: string;
  eventType: "Regional" | "International" | "Worlds" | "Generic";
}

// Dimensions for 2100x2100 canvas
const LOGO_WIDTH = 255;
const USAGE_LINE_WIDTH = 1381;
// Text spans from end of logo to end of usage line
const TEXT_WIDTH = USAGE_LINE_WIDTH - LOGO_WIDTH - 24; // minus gap

interface DynamicTitleProps {
  title: string;
  width: number;
  fontSize: number;
}

interface TitleStyles {
  letterSpacing: number;
  lineCount: number;
}

function DynamicTitle({ title, width, fontSize }: DynamicTitleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [styles, setStyles] = useState<TitleStyles>({ letterSpacing: 0, lineCount: 0 });

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    // Create a hidden span to measure text
    const measureSpan = document.createElement("span");
    measureSpan.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: nowrap;
      font-size: ${fontSize}px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0;
    `;

    document.body.appendChild(measureSpan);

    // Split title into words
    const words = title.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    // Measure each word and determine line breaks
    // We want at least 2 lines, so we need to find where to break
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      measureSpan.textContent = testLine;
      const testWidth = measureSpan.offsetWidth;

      // If adding this word exceeds width, start new line
      if (testWidth > width * 0.9 && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    // Calculate letter spacing for each line to fill width
    // Find the minimum spacing that works for all lines
    let minSpacing = 0;

    for (const line of lines) {
      measureSpan.textContent = line;
      const naturalWidth = measureSpan.offsetWidth;
      const charCount = line.replace(/\s/g, "").length;

      if (charCount > 0 && naturalWidth < width) {
        // Calculate spacing needed: (targetWidth - naturalWidth) / charCount
        const neededSpacing = (width - naturalWidth) / charCount;
        // Use the smallest spacing that works for all lines
        if (minSpacing === 0 || neededSpacing < minSpacing) {
          minSpacing = neededSpacing;
        }
      }
    }

    document.body.removeChild(measureSpan);

    // Apply the calculated spacing (clamped to reasonable range) and line count
    // eslint-disable-next-line react-hooks/set-state-in-effect -- DOM measurement requires sync state update
    setStyles({
      letterSpacing: Math.min(Math.max(minSpacing, 0), fontSize * 0.5),
      lineCount: lines.length,
    });
  }, [title, width, fontSize]);

  // Center align if more than 2 lines, otherwise left align
  const textAlign = styles.lineCount > 2 ? "center" : "left";

  return (
    <div
      ref={containerRef}
      style={{
        width,
        color: "white",
        fontSize,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: `${styles.letterSpacing}px`,
        lineHeight: 1.1,
        margin: 0,
        wordWrap: "break-word",
        overflowWrap: "break-word",
        textAlign,
      }}
    >
      {title}
    </div>
  );
}

export function GraphicHeader({
  eventName,
  eventYear,
  eventType,
}: GraphicHeaderProps) {
  // Get the logo based on event type
  const logoSrc =
    eventType === "Regional"
      ? "/assets/graphic/regional.png"
      : eventType === "International"
        ? "/assets/graphic/regional.png" // TODO: Add international logo
        : eventType === "Worlds"
          ? "/assets/graphic/regional.png" // TODO: Add worlds logo
          : "/assets/graphic/generic.png";

  // Combine event name with Championships for dynamic title
  const fullTitle = `${eventName} Championships`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 24,
      }}
    >
      {/* Regional Championship Logo */}
      <div
        style={{
          width: LOGO_WIDTH,
          flexShrink: 0,
        }}
      >
        <img
          src={logoSrc}
          alt={`${eventType} Championship`}
          width={LOGO_WIDTH}
          height={LOGO_WIDTH}
          style={{ objectFit: "contain" }}
        />
      </div>

      {/* Event Title - left-aligned text spanning to end of usage line */}
      <div
        style={{
          width: TEXT_WIDTH,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          textAlign: "left",
        }}
      >
        <p
          style={{
            color: "white",
            fontSize: 30,
            fontFamily: "Urbane, sans-serif",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            margin: 0,
          }}
        >
          {eventYear} Pokémon GO Championship Series
        </p>
        <DynamicTitle title={fullTitle} width={TEXT_WIDTH} fontSize={63} />
      </div>
    </div>
  );
}
