"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { TournamentForm } from "@/components/form/tournament-form";
import {
  TournamentGraphic,
  type TournamentGraphicRef,
} from "@/components/graphic/tournament-graphic";
import { ExportWarningDialog } from "@/components/form/export-warning-dialog";
import { ExportResultDialog } from "@/components/form/export-result-dialog";
import { convertToGraphicData } from "@/lib/graphic-data";
import {
  downloadImage,
  isMobileDevice,
  releaseImages,
  renderElementToImage,
  type ExportedImage,
} from "@/lib/export-image";
import type { TournamentData } from "@/lib/types";

export default function Home() {
  const [tournamentData, setTournamentData] = useState<TournamentData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportWarning, setShowExportWarning] = useState(false);
  const [showExportResult, setShowExportResult] = useState(false);
  const [exportedImages, setExportedImages] = useState<ExportedImage[]>([]);
  const [exportError, setExportError] = useState<string | null>(null);
  const graphicRef = useRef<TournamentGraphicRef>(null);

  // Convert form data to graphic data
  const graphicData = useMemo(() => {
    if (!tournamentData) return null;
    return convertToGraphicData(tournamentData);
  }, [tournamentData]);

  // Object URLs outlive React state, so release them when they go out of use.
  useEffect(() => {
    return () => releaseImages(exportedImages);
  }, [exportedImages]);

  const handleResultOpenChange = useCallback((open: boolean) => {
    setShowExportResult(open);
    if (!open) {
      setExportedImages([]);
      setExportError(null);
    }
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportedImages([]);

    try {
      const targets: { element: HTMLDivElement; name: string }[] = [];

      if (graphicRef.current?.isMultiCanvas) {
        const winners = graphicRef.current?.getWinnersCanvasElement?.();
        const losers = graphicRef.current?.getLosersCanvasElement?.();
        if (winners) targets.push({ element: winners, name: "tournament-winners" });
        if (losers) targets.push({ element: losers, name: "tournament-losers" });
      } else {
        const canvasElement = graphicRef.current?.getCanvasElement();
        if (canvasElement) {
          targets.push({ element: canvasElement, name: "tournament-graphic" });
        }
      }

      if (targets.length === 0) {
        throw new Error("The graphic isn't ready yet. Fill in the form and try again.");
      }

      const images: ExportedImage[] = [];
      for (const target of targets) {
        images.push(await renderElementToImage(target.element, target.name));
      }

      // Mobile browsers ignore the download attribute, so hand the images to the
      // user as previews they can save or share instead of firing a download.
      if (isMobileDevice()) {
        setExportedImages(images);
        setShowExportResult(true);
      } else {
        for (const [index, image] of images.entries()) {
          // Chrome throttles back-to-back programmatic downloads.
          if (index > 0) await new Promise((resolve) => setTimeout(resolve, 300));
          downloadImage(image);
        }
        // Revoking immediately can cancel an in-flight download.
        setTimeout(() => releaseImages(images), 60_000);
      }
    } catch (error) {
      console.error("Export failed:", error);
      setExportError(
        error instanceof Error ? error.message : "Something went wrong while exporting."
      );
      setShowExportResult(true);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-8 px-4 sm:px-6 lg:px-8 py-8 min-h-0">
        {/* Form Section - scrolls independently */}
        <div className="flex flex-col min-h-0">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 shrink-0">Tournament Details</h2>
          <div id="form-scroll-container" className="overflow-y-auto flex-1 pr-2">
            <TournamentForm
              onFormChange={(data) => setTournamentData(data)}
            />
          </div>
        </div>

        {/* Preview Section - shows graphic */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h2 className="text-xl sm:text-2xl font-semibold">Preview</h2>
            <button
              onClick={() => setShowExportWarning(true)}
              disabled={isExporting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {isExporting
                ? "Exporting..."
                : tournamentData?.playerCount === 64
                  ? "Export Images (2)"
                  : "Export Image"}
            </button>
            <ExportWarningDialog
              open={showExportWarning}
              onOpenChange={setShowExportWarning}
              tournamentData={tournamentData}
              onProceed={handleExport}
            />
            <ExportResultDialog
              open={showExportResult}
              onOpenChange={handleResultOpenChange}
              images={exportedImages}
              error={exportError}
            />
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
