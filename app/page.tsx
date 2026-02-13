"use client";

import { useState, useRef, useMemo } from "react";
import html2canvas from "html2canvas-pro";
import { TournamentForm } from "@/components/form/tournament-form";
import {
  TournamentGraphic,
  type TournamentGraphicRef,
} from "@/components/graphic/tournament-graphic";
import { convertToGraphicData } from "@/lib/graphic-data";
import type { TournamentData } from "@/lib/types";

export default function Home() {
  const [tournamentData, setTournamentData] = useState<TournamentData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const graphicRef = useRef<TournamentGraphicRef>(null);

  // Convert form data to graphic data
  const graphicData = useMemo(() => {
    if (!tournamentData) return null;
    return convertToGraphicData(tournamentData);
  }, [tournamentData]);

  // Helper function to export a single canvas element
  const exportCanvas = async (element: HTMLDivElement, filename: string) => {
    const originalTransform = element.style.transform;
    element.style.transform = "none";

    // Wait for all images to be fully loaded
    const images = element.querySelectorAll("img");
    await Promise.all(
      Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    // Wait a frame for the transform change to apply
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
    });

    const dataUrl = canvas.toDataURL("image/png");
    element.style.transform = originalTransform;

    const link = document.createElement("a");
    link.download = `${filename}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Check if this is a multi-canvas export (Top 64)
      const isMultiCanvas = graphicRef.current?.isMultiCanvas;

      if (isMultiCanvas) {
        // Export both Winners and Losers graphics
        const winnersCanvas = graphicRef.current?.getWinnersCanvasElement?.();
        const losersCanvas = graphicRef.current?.getLosersCanvasElement?.();

        if (winnersCanvas) {
          await exportCanvas(winnersCanvas, "tournament-winners");
        }
        if (losersCanvas) {
          // Small delay between downloads to ensure both trigger
          await new Promise((resolve) => setTimeout(resolve, 500));
          await exportCanvas(losersCanvas, "tournament-losers");
        }
      } else {
        // Single canvas export
        const canvasElement = graphicRef.current?.getCanvasElement();
        if (canvasElement) {
          await exportCanvas(canvasElement, "tournament-graphic");
        }
      }
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
              {isExporting
                ? "Exporting..."
                : tournamentData?.playerCount === 64
                  ? "Export Images (2)"
                  : "Export Image"}
            </button>
          </div>
          <div className="border rounded-lg bg-muted/50 flex-1 overflow-auto">
            {graphicData ? (
              <TournamentGraphic ref={graphicRef} data={graphicData} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Fill in the form to generate a graphic preview
              </div>
            )}
          </div>
          {tournamentData && (
            <div className="text-xs text-muted-foreground space-y-1 mt-4 shrink-0">
              <p>Title: {tournamentData.titleLines?.filter(l => l).join(" ") || "Not set"}</p>
              <p>Type: {tournamentData.eventType}</p>
              <p>Overview: {tournamentData.overviewType}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
