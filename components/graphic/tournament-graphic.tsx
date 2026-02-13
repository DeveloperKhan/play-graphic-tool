"use client";

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { GraphicHeader } from "./graphic-header";
import { UsageSection } from "./usage-section";
import { BracketSection } from "./bracket-section";
import { PlayerColumn } from "./player-column";
import { GraphicFooter } from "./graphic-footer";
import { TournamentGraphic64, TournamentGraphic64Ref } from "./tournament-graphic-64";
import { getPlayersByColumn, type GraphicData } from "@/lib/graphic-data";

// Base canvas dimensions
export const CANVAS_WIDTH = 2100;
export const CANVAS_HEIGHT = 2100;

interface TournamentGraphicProps {
  data: GraphicData;
}

export interface TournamentGraphicRef {
  getCanvasElement: () => HTMLDivElement | null;
  // For Top 64 multi-canvas support
  getWinnersCanvasElement?: () => HTMLDivElement | null;
  getLosersCanvasElement?: () => HTMLDivElement | null;
  isMultiCanvas?: boolean;
}

export const TournamentGraphic = forwardRef<TournamentGraphicRef, TournamentGraphicProps>(
  function TournamentGraphic({ data }, ref) {
  const { winnersCol1, winnersCol2, losers } = getPlayersByColumn(data);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const graphic64Ref = useRef<TournamentGraphic64Ref>(null);
  const [scale, setScale] = useState(1);

  // For Top 64, delegate to TournamentGraphic64
  const isTop64 = data.playerCount === 64;

  useImperativeHandle(ref, () => ({
    getCanvasElement: () => isTop64 ? null : canvasRef.current,
    getWinnersCanvasElement: () => graphic64Ref.current?.getWinnersCanvasElement() ?? null,
    getLosersCanvasElement: () => graphic64Ref.current?.getLosersCanvasElement() ?? null,
    isMultiCanvas: isTop64,
  }));

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

  // Render Top 64 with tabs
  if (isTop64) {
    return <TournamentGraphic64 ref={graphic64Ref} data={data} />;
  }

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
        ref={canvasRef}
        data-canvas
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {/* Background image */}
        <img
          src="/assets/graphic/background.jpg"
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            objectFit: "cover",
          }}
        />
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
          {/* Header - logo at x=33, y=87 (hidden when overviewType is "None") */}
          {data.overviewType !== "None" && (
            <div style={{ position: "absolute", top: 87, left: 33 }}>
              <GraphicHeader
                titleLines={
                  // In bracket mode, only show the first title line
                  data.overviewType === "Bracket"
                    ? [data.titleLines[0], "", ""]
                    : data.titleLines
                }
                eventYear={data.eventYear}
                eventType={data.eventType}
              />
            </div>
          )}

          {/* Usage Section - positioned at 352px from top (only for Usage mode) */}
          {data.overviewType === "Usage" && (
            <div style={{ position: "absolute", top: 352, left: 19 }}>
              <UsageSection
                usageStats={data.usageStats}
                totalPlayers={data.players.length}
              />
            </div>
          )}

          {/* Bracket Section - positioned at x=43, y=224 (only for Bracket mode) */}
          {data.overviewType === "Bracket" && (
            <div style={{ position: "absolute", top: 224, left: 43 }}>
              <BracketSection
                players={data.players}
                bracketReset={data.bracketReset ?? false}
              />
            </div>
          )}

          {/* Losers Bracket - First half at x=1440, y=169 */}
          <div style={{ position: "absolute", top: 169, left: 1440 }}>
            <PlayerColumn
              title={data.bracketLabels?.losers?.enabled ? data.bracketLabels.losers.text : undefined}
              players={losers.slice(0, 4)}
              startPairIndex={0}
              wrapper={data.columnWrappers?.losers1}
            />
          </div>

          {/* Losers Bracket - Second half (no header) at x=1440 */}
          <div style={{ position: "absolute", top: 1115, left: 1440 }}>
            <PlayerColumn
              players={losers.slice(4)}
              startPairIndex={2}
              wrapper={data.columnWrappers?.losers2}
              reserveTitleSpace={false}
            />
          </div>

          {/* Winners Bracket - Column 1 at x=19, y=1050 */}
          <div style={{ position: "absolute", top: 1050, left: 19 }}>
            <PlayerColumn
              title={data.bracketLabels?.winners?.enabled ? data.bracketLabels.winners.text : undefined}
              players={winnersCol1}
              startPairIndex={0}
              wrapper={data.columnWrappers?.winners1}
            />
          </div>

          {/* Winners Bracket - Column 2 at x=751, y=1050 */}
          <div style={{ position: "absolute", top: 1050, left: 751 }}>
            <PlayerColumn
              title={data.bracketLabels?.winners?.enabled ? data.bracketLabels.winners.text : undefined}
              players={winnersCol2}
              startPairIndex={Math.ceil(winnersCol1.length / 2)}
              wrapper={data.columnWrappers?.winners2}
            />
          </div>

          {/* Footer - positioned 20px from bottom */}
          <div style={{ position: "absolute", top: 1964, left: 0, right: 0 }}>
            <GraphicFooter />
          </div>
        </div>
      </div>
    </div>
  );
});
