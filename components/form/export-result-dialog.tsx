"use client";

import { useState } from "react";
import { AlertTriangle, Download, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { canShareImages, shareImages, type ExportedImage } from "@/lib/export-image";

interface ExportResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: ExportedImage[];
  error: string | null;
}

export function ExportResultDialog({
  open,
  onOpenChange,
  images,
  error,
}: ExportResultDialogProps) {
  const [shareError, setShareError] = useState<string | null>(null);
  const canShare = canShareImages(images);

  const handleShare = async (toShare: ExportedImage[]) => {
    setShareError(null);
    try {
      await shareImages(toShare, "Tournament graphic");
    } catch (err) {
      // The user closing the share sheet rejects with AbortError.
      if (err instanceof Error && err.name === "AbortError") return;
      setShareError("Sharing failed. Use Save, or long-press the image instead.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {error && <AlertTriangle className="h-5 w-5 text-amber-500" />}
            {error
              ? "Export failed"
              : images.length > 1
                ? `${images.length} graphics ready`
                : "Graphic ready"}
          </DialogTitle>
          <DialogDescription>
            {error
              ? error
              : "Save each image, or long-press it and choose Save to Photos."}
          </DialogDescription>
        </DialogHeader>

        {images.length > 1 && canShare && (
          <Button onClick={() => handleShare(images)} className="w-full">
            <Share2 />
            Share both
          </Button>
        )}

        <div className="space-y-4">
          {images.map((image) => (
            <div key={image.url} className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.filename}
                className="w-full rounded-md border bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                {image.filename} · {image.width}×{image.height}
              </p>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <a href={image.url} download={image.filename}>
                    <Download />
                    Save
                  </a>
                </Button>
                {canShare && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleShare([image])}
                  >
                    <Share2 />
                    Share
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {shareError && (
          <p className="text-xs text-amber-600 dark:text-amber-500">{shareError}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
