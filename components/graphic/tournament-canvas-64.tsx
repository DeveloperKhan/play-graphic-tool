"use client";

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { GraphicHeader } from "./graphic-header";
import { UsageSection } from "./usage-section";
import { PlayerColumn } from "./player-column";
import { GraphicFooter } from "./graphic-footer";
import { CalendarBadge } from "./calendar-badge";
import { getPlayersByColumn64, type GraphicData } from "@/lib/graphic-data";

// Canvas dimensions for Top 64 (each graphic - Winners or Losers)
export const CANVAS_WIDTH_64 = 3411.54;
export const CANVAS_HEIGHT_64 = 2078;

interface TournamentCanvas64Props {
  data: GraphicData;
  bracketType: "winners" | "losers";
}

export interface TournamentCanvas64Ref {
  getCanvasElement: () => HTMLDivElement | null;
}

export const TournamentCanvas64 = forwardRef<TournamentCanvas64Ref, TournamentCanvas64Props>(
  function TournamentCanvas64({ data, bracketType }, ref) {
    const { col1a, col1b, col2a, col2b, col3a, col3b, col4a, col4b } = getPlayersByColumn64(data.players);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useImperativeHandle(ref, () => ({
      getCanvasElement: () => canvasRef.current,
    }));

    // Calculate scale based on container width
    // Use ResizeObserver to detect when tab becomes visible (width changes from 0)
    useEffect(() => {
      const updateScale = () => {
        if (containerRef.current) {
          const containerWidth = containerRef.current.offsetWidth;
          if (containerWidth > 0) {
            setScale(containerWidth / CANVAS_WIDTH_64);
          }
        }
      };

      updateScale();

      // ResizeObserver handles both window resize and visibility changes
      const resizeObserver = new ResizeObserver(() => {
        updateScale();
      });

      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    // Get bracket label based on type
    const bracketLabel = bracketType === "winners"
      ? (data.bracketLabels?.winners?.enabled ? data.bracketLabels.winners.text : undefined)
      : (data.bracketLabels?.losers?.enabled ? data.bracketLabels.losers.text : undefined);

    // Get column wrapper configs based on bracket type and column position
    // Each 4-player block has its own wrapper: col1a, col1b, col2a, col2b, col3a, col3b, col4a, col4b
    const getWrapper = (colNum: 1 | 2 | 3 | 4, position: "a" | "b") => {
      const key = `${bracketType}${colNum}${position}` as keyof typeof data.columnWrappers;
      return data.columnWrappers?.[key];
    };

    return (
      <div
        ref={containerRef}
        style={{
          width: "100%",
          aspectRatio: `${CANVAS_WIDTH_64} / ${CANVAS_HEIGHT_64}`,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Scaled canvas - renders at full size and scales down */}
        <div
          ref={canvasRef}
          data-canvas
          style={{
            width: CANVAS_WIDTH_64,
            height: CANVAS_HEIGHT_64,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {/* Background image - uses background-32.png */}
          <img
            src="/assets/graphic/background-32.png"
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: CANVAS_WIDTH_64,
              height: CANVAS_HEIGHT_64,
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
            {/* Calendar Badge - top left corner */}
            {data.eventDateRange?.startDate && data.eventDateRange?.endDate && (
              <div style={{ position: "absolute", top: 87, left: 33 }}>
                <CalendarBadge
                  startDate={data.eventDateRange.startDate}
                  endDate={data.eventDateRange.endDate}
                />
              </div>
            )}

            {/* Header - position at top left (shifted right if calendar badge is shown) */}
            {data.overviewType !== "None" && (
              <div style={{
                position: "absolute",
                top: 50,
                left: data.eventDateRange?.startDate && data.eventDateRange?.endDate ? 301 : 33
              }}>
                <GraphicHeader
                  titleLines={data.titleLines}
                  eventYear={data.eventYear}
                  eventType={data.eventType}
                />
              </div>
            )}

            {/* Usage Section - positioned below header */}
            {data.overviewType === "Usage" && (
              <div style={{ position: "absolute", top: 300, left: 19 }}>
                <UsageSection
                  usageStats={data.usageStats}
                  totalPlayers={64}
                />
              </div>
            )}

            {/* Column 1 Top - Groups A-B (left side, bottom area) */}
            <div style={{ position: "absolute", top: 1050, left: 19 }}>
              <PlayerColumn
                title={bracketLabel}
                players={col1a}
                startPairIndex={0}
                wrapper={getWrapper(1, "a")}
              />
            </div>

            {/* Column 1 Bottom - Groups C-D (left side, bottom area) */}
            <div style={{ position: "absolute", top: 1050, left: 751 }}>
              <PlayerColumn
                players={col1b}
                startPairIndex={1}
                wrapper={getWrapper(1, "b")}
                reserveTitleSpace={!!bracketLabel}
              />
            </div>

            {/* Column 2 Top - Groups E-F (right side, full height) */}
            <div style={{ position: "absolute", top: 169, left: 1440 }}>
              <PlayerColumn
                title={bracketLabel}
                players={col2a}
                startPairIndex={0}
                wrapper={getWrapper(2, "a")}
              />
            </div>

            {/* Column 2 Bottom - Groups G-H (right side, aligned with col1a/col1b) */}
            <div style={{ position: "absolute", top: 1050, left: 1440 }}>
              <PlayerColumn
                players={col2b}
                startPairIndex={2}
                wrapper={getWrapper(2, "b")}
                reserveTitleSpace={!!bracketLabel}
              />
            </div>

            {/* Column 3 Top - Groups I-J (right side) */}
            <div style={{ position: "absolute", top: 169, left: 2100 }}>
              <PlayerColumn
                players={col3a}
                startPairIndex={0}
                wrapper={getWrapper(3, "a")}
                reserveTitleSpace={!!bracketLabel}
              />
            </div>

            {/* Column 3 Bottom - Groups K-L (right side, aligned with col1a/col1b) */}
            <div style={{ position: "absolute", top: 1050, left: 2100 }}>
              <PlayerColumn
                players={col3b}
                startPairIndex={2}
                wrapper={getWrapper(3, "b")}
                reserveTitleSpace={!!bracketLabel}
              />
            </div>

            {/* Column 4 Top - Groups M-N (right side) */}
            <div style={{ position: "absolute", top: 169, left: 2760 }}>
              <PlayerColumn
                players={col4a}
                startPairIndex={0}
                wrapper={getWrapper(4, "a")}
                reserveTitleSpace={!!bracketLabel}
              />
            </div>

            {/* Column 4 Bottom - Groups O-P (right side, aligned with col1a/col1b) */}
            <div style={{ position: "absolute", top: 1050, left: 2760 }}>
              <PlayerColumn
                players={col4b}
                startPairIndex={2}
                wrapper={getWrapper(4, "b")}
                reserveTitleSpace={!!bracketLabel}
              />
            </div>

            {/* Footer - positioned at bottom */}
            <div style={{ position: "absolute", top: 1950, left: 0, right: 0 }}>
              <GraphicFooter extended />
            </div>
          </div>
        </div>
      </div>
    );
  }
);
