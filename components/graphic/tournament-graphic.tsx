"use client";

import { useRef, useEffect, useState } from "react";
import { GraphicHeader } from "./graphic-header";
import { UsageSection } from "./usage-section";
import { PlayerColumn } from "./player-column";
import { GraphicFooter } from "./graphic-footer";
import type { GraphicData } from "@/lib/graphic-data";
import { getPlayersByColumn } from "@/lib/las-vegas-data";

// Base canvas dimensions
const CANVAS_WIDTH = 2100;
const CANVAS_HEIGHT = 2100;

interface TournamentGraphicProps {
  data: GraphicData;
}

export function TournamentGraphic({ data }: TournamentGraphicProps) {
  const { winnersCol1, winnersCol2, losers } = getPlayersByColumn(data);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Calculate scale based on container width
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        setScale(containerWidth / CANVAS_WIDTH);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        aspectRatio: "1 / 1",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Scaled canvas - renders at 2100x2100 and scales down */}
      <div
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          backgroundImage: "url('/assets/graphic/background.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {/* Content container */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          {/* Header - logo at x=33, y=87 */}
          <div style={{ position: "absolute", top: 87, left: 33 }}>
            <GraphicHeader
              eventName={data.eventName}
              eventYear={data.eventYear}
              eventType={data.eventType}
            />
          </div>

          {/* Usage Section - positioned at 352px from top */}
          <div style={{ position: "absolute", top: 352, left: 19 }}>
            <UsageSection
              usageStats={data.usageStats}
              totalPlayers={data.players.length}
            />
          </div>

          {/* Losers Bracket - First half at x=1440, y=169 */}
          <div style={{ position: "absolute", top: 169, left: 1440 }}>
            <PlayerColumn
              title="Losers Bracket"
              players={losers.slice(0, 4)}
              startPairIndex={0}
            />
          </div>

          {/* Losers Bracket - Second half (no header) at x=1440 */}
          <div style={{ position: "absolute", top: 1115, left: 1440 }}>
            <PlayerColumn
              players={losers.slice(4)}
              startPairIndex={2}
            />
          </div>

          {/* Winners Bracket - Column 1 at x=19, y=1050 */}
          <div style={{ position: "absolute", top: 1050, left: 19 }}>
            <PlayerColumn
              title="Winners Bracket"
              players={winnersCol1}
              startPairIndex={0}
            />
          </div>

          {/* Winners Bracket - Column 2 at x=751, y=1050 */}
          <div style={{ position: "absolute", top: 1050, left: 751 }}>
            <PlayerColumn
              title="Winners Bracket"
              players={winnersCol2}
              startPairIndex={Math.ceil(winnersCol1.length / 2)}
            />
          </div>

          {/* Footer - positioned at y=1993 */}
          <div style={{ position: "absolute", top: 1993, left: 0, right: 0 }}>
            <GraphicFooter />
          </div>
        </div>
      </div>
    </div>
  );
}
