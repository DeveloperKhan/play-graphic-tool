"use client";

import { useState, useRef } from "react";
import { toPng } from "html-to-image";
import { TournamentForm } from "@/components/form/tournament-form";
import {
  TournamentGraphic,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  type TournamentGraphicRef,
} from "@/components/graphic/tournament-graphic";
import { lasVegasData } from "@/lib/las-vegas-data";
import type { TournamentData } from "@/lib/types";

export default function Home() {
  const [tournamentData, setTournamentData] = useState<TournamentData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const graphicRef = useRef<TournamentGraphicRef>(null);

  const handleExport = async () => {
    const canvasElement = graphicRef.current?.getCanvasElement();
    if (!canvasElement) return;

    setIsExporting(true);
    try {
      // Store original transform and temporarily remove it for capture
      const originalTransform = canvasElement.style.transform;
      canvasElement.style.transform = "none";

      // Wait a frame for the transform change to apply
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const dataUrl = await toPng(canvasElement, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        pixelRatio: 1,
        cacheBust: false, // Must be false - true adds timestamps that break image URLs
        skipAutoScale: true,
      });

      // Restore original transform
      canvasElement.style.transform = originalTransform;

      const link = document.createElement("a");
      link.download = `tournament-graphic-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      <div className="px-4 sm:px-6 lg:px-8 py-6 shrink-0">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
          Play! Pokemon GO Tournament Graphic Generator
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Create professional tournament graphics for your Pokemon GO events
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-8 px-4 sm:px-6 lg:px-8 pb-8 min-h-0">
        {/* Form Section - scrolls independently */}
        <div className="flex flex-col min-h-0">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 shrink-0">Tournament Details</h2>
          <div id="form-scroll-container" className="overflow-y-auto flex-1 pr-2">
            <TournamentForm
              playerCount={16}
              onFormChange={(data) => setTournamentData(data)}
            />
          </div>
        </div>

        {/* Preview Section - shows graphic */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h2 className="text-xl sm:text-2xl font-semibold">Preview</h2>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {isExporting ? "Exporting..." : "Export Image"}
            </button>
          </div>
          <div className="border rounded-lg bg-muted/50 flex-1 overflow-auto">
            <TournamentGraphic ref={graphicRef} data={lasVegasData} />
          </div>
          {tournamentData && (
            <div className="text-xs text-muted-foreground space-y-1 mt-4 shrink-0">
              <p>Event: {tournamentData.eventName || "Not set"}</p>
              <p>Type: {tournamentData.eventType}</p>
              <p>Overview: {tournamentData.overviewType}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
