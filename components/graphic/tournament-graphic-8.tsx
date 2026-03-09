"use client";

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { GraphicHeader } from "./graphic-header";
import { UsageSection } from "./usage-section";
import { BracketSection } from "./bracket-section";
import { PlayerColumn } from "./player-column";
import { GraphicFooter } from "./graphic-footer";
import { CalendarBadge } from "./calendar-badge";
import { getPlayersByColumn8, type GraphicData } from "@/lib/graphic-data";

// Canvas dimensions for Top 8 (same as background image)
export const CANVAS_WIDTH_8 = 1515;
export const CANVAS_HEIGHT_8 = 2078;

interface TournamentGraphic8Props {
  data: GraphicData;
}

export interface TournamentGraphic8Ref {
  getCanvasElement: () => HTMLDivElement | null;
}

export const TournamentGraphic8 = forwardRef<TournamentGraphic8Ref, TournamentGraphic8Props>(
  function TournamentGraphic8({ data }, ref) {
    const { winnersCol1, winnersCol2 } = getPlayersByColumn8(data);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useImperativeHandle(ref, () => ({
      getCanvasElement: () => canvasRef.current,
    }));

    // Calculate scale based on container width
    useEffect(() => {
      const updateScale = () => {
        if (containerRef.current) {
          const containerWidth = containerRef.current.offsetWidth;
          setScale(containerWidth / CANVAS_WIDTH_8);
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
          aspectRatio: `${CANVAS_WIDTH_8} / ${CANVAS_HEIGHT_8}`,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Scaled canvas - renders at full size and scales down */}
        <div
          ref={canvasRef}
          data-canvas
          style={{
            width: CANVAS_WIDTH_8,
            height: CANVAS_HEIGHT_8,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {/* Background image */}
          <img
            src="/assets/graphic/background-8.png"
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: CANVAS_WIDTH_8,
              height: CANVAS_HEIGHT_8,
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
            {/* Calendar Badge - top left corner (larger and lower in Bracket mode) */}
            {data.eventDateRange?.startDate && data.eventDateRange?.endDate && (
              <div style={{
                position: "absolute",
                top: data.overviewType === "Bracket" ? 260 : 87,
                left: data.overviewType === "Bracket" ? 83 : 73
              }}>
                <CalendarBadge
                  startDate={data.eventDateRange.startDate}
                  endDate={data.eventDateRange.endDate}
                  size={data.overviewType === "Bracket" ? "large" : "default"}
                />
              </div>
            )}

            {/* Header - logo at x=33, y=87 (shifted right if calendar badge is shown, except in Bracket mode) */}
            {/* In Bracket mode, header is at y=65 to match Top 32 spacing */}
            {data.overviewType !== "None" && (
              <div style={{
                position: "absolute",
                top: data.overviewType === "Bracket" ? 75 : 107,
                // In Bracket mode, calendar is positioned lower so header doesn't need to shift
                left: data.eventDateRange?.startDate && data.eventDateRange?.endDate && data.overviewType !== "Bracket" ? 301 : 75
              }}>
                <GraphicHeader
                  titleLines={
                    // In bracket mode, only show the first title line
                    data.overviewType === "Bracket"
                      ? [data.titleLines[0], "", ""]
                      : data.titleLines
                  }
                  eventYear={data.eventYear}
                  eventType={data.eventType}
                  titleFontSize={93}
                  textWidth={1365}
                />
              </div>
            )}

            {/* Usage Section - centered horizontally (1381px wide in 1515px canvas) */}
            {data.overviewType === "Usage" && (
              <div style={{ position: "absolute", top: 352, left: 67 }}>
                <UsageSection
                  usageStats={data.usageStats}
                  totalPlayers={data.players.length}
                />
              </div>
            )}

            {/* Bracket Section - centered horizontally (1350px wide in 1515px canvas) */}
            {data.overviewType === "Bracket" && (
              <div style={{ position: "absolute", top: 254, left: 83 }}>
                <BracketSection
                  bracketPositions={data.bracketPositions}
                  bracketReset={data.bracketReset ?? false}
                />
              </div>
            )}

            {/* Winners Bracket - Column 1 (centered: 2 columns in 1515px canvas) */}
            <div style={{ position: "absolute", top: 1040, left: 83 }}>
              <PlayerColumn
                title={data.bracketLabels?.winners?.enabled ? data.bracketLabels.winners.text : undefined}
                players={winnersCol1}
                startPairIndex={0}
                wrapper={data.columnWrappers?.winners1}
              />
            </div>

            {/* Winners Bracket - Column 2 */}
            <div style={{ position: "absolute", top: 1040, left: 792 }}>
              <PlayerColumn
                title={data.bracketLabels?.winners?.enabled ? data.bracketLabels.winners.text : undefined}
                players={winnersCol2}
                startPairIndex={Math.ceil(winnersCol1.length / 2)}
                wrapper={data.columnWrappers?.winners2}
              />
            </div>

            {/* Footer - positioned near bottom */}
            <div style={{ position: "absolute", top: 1942, left: 0, right: 0 }}>
              <GraphicFooter compact />
            </div>
          </div>
        </div>
      </div>
    );
  }
);
