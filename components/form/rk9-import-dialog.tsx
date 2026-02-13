"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { convertRK9ToFormData, type RK9TeamData } from "@/lib/rk9-import";
import type { Pokemon } from "@/lib/types";

interface RK9ImportDialogProps {
  onImport: (data: { name: string; team: Pokemon[] }) => void;
}

export function RK9ImportDialog({ onImport }: RK9ImportDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<RK9TeamData | null>(null);

  const handleFetch = async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPreview(null);

    try {
      const response = await fetch("/api/rk9-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || "Failed to fetch team data");
        return;
      }

      setPreview(result.data);
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, errors } = await convertRK9ToFormData(preview);

      if (errors.length > 0) {
        // Show errors but still allow import
        console.warn("RK9 import warnings:", errors);
      }

      onImport(data);
      handleClose();
    } catch (err) {
      setError("Failed to convert team data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setUrl("");
    setError(null);
    setPreview(null);
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="text-xs">
          <Download className="h-3 w-3 mr-1" />
          Import from RK9
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from RK9</DialogTitle>
          <DialogDescription>
            Paste an RK9 team list URL to import the player&apos;s name and team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rk9-url">RK9 Team List URL</Label>
            <Input
              id="rk9-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://rk9.gg/teamlist-go/public/..."
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Format: https://rk9.gg/teamlist-go/public/{"<token>"}
            </p>
          </div>

          {preview && (
            <div className="p-3 text-sm bg-muted rounded-md space-y-2">
              <p><strong>Player:</strong> {preview.playerName}</p>
              <p><strong>Team:</strong></p>
              <ul className="list-disc list-inside pl-2">
                {preview.pokemon.map((p, i) => (
                  <li key={i}>
                    {p.name}{p.isShadow ? " (Shadow)" : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {!preview ? (
            <Button
              type="button"
              onClick={handleFetch}
              disabled={!url.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                "Fetch Team"
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleImport}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
