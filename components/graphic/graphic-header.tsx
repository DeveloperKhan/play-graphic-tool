"use client";

import { useLayoutEffect, useRef, useState } from "react";

interface GraphicHeaderProps {
  titleLines: [string, string, string];
  eventYear: string;
  eventType: "Regional" | "International" | "Worlds" | "Generic";
}

// Dimensions for 2100x2100 canvas
// Text spans the full width of the usage line area (no logo due to Pokemon policy)
const TEXT_WIDTH = 1381;
const TITLE_FONT_SIZE = 63;

interface TitleLineProps {
  text: string;
  width: number;
  fontSize: number;
}

function TitleLine({ text, width, fontSize }: TitleLineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [letterSpacing, setLetterSpacing] = useState(0);

  useLayoutEffect(() => {
    if (!containerRef.current || !text.trim()) return;

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
    measureSpan.textContent = text;

    document.body.appendChild(measureSpan);

    const naturalWidth = measureSpan.offsetWidth;
    const charCount = text.replace(/\s/g, "").length;

    document.body.removeChild(measureSpan);

    if (charCount > 0 && naturalWidth < width) {
      // Calculate spacing needed: (targetWidth - naturalWidth) / charCount
      const neededSpacing = (width - naturalWidth) / charCount;
      // Clamp to reasonable range
      setLetterSpacing(Math.min(Math.max(neededSpacing, 0), fontSize * 0.5));
    }
  }, [text, width, fontSize]);

  return (
    <div
      ref={containerRef}
      style={{
        width,
        color: "white",
        fontSize,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: `${letterSpacing}px`,
        lineHeight: 1.1,
        margin: 0,
      }}
    >
      {text}
    </div>
  );
}

export function GraphicHeader({
  titleLines,
  eventYear,
}: GraphicHeaderProps) {
  // Filter out empty lines
  const visibleLines = titleLines.filter((line) => line.trim().length > 0);

  return (
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
      <div
        style={{
          width: TEXT_WIDTH,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        {visibleLines.map((line, index) => (
          <TitleLine
            key={index}
            text={line}
            width={TEXT_WIDTH}
            fontSize={TITLE_FONT_SIZE}
          />
        ))}
      </div>
    </div>
  );
}
