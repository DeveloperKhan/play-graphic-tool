"use client";

import * as React from "react";
import { Flag, Loader2 } from "lucide-react";
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
import { getFlagsForPlayer } from "@/lib/player-flag-config";

interface RosterPlayer {
  firstName: string;
  lastName: string;
  screenName: string;
  country: string;
}

interface FlagUpdate {
  playerId: string;
  playerName: string;
  flags: string[];
  source: "known" | "rk9";
}

interface RK9RosterImportDialogProps {
  getPlayerNames: () => Record<string, string>; // Function to get fresh playerId -> name mapping
  onImportFlags: (updates: Array<{ playerId: string; flags: string[] }>) => void;
}

export function RK9RosterImportDialog({
  getPlayerNames,
  onImportFlags,
}: RK9RosterImportDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<FlagUpdate[] | null>(null);
  const [rosterPlayers, setRosterPlayers] = React.useState<RosterPlayer[] | null>(null);

  const handleFetch = async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPreview(null);
    setRosterPlayers(null);

    try {
      const response = await fetch("/api/rk9-roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || "Failed to fetch roster data");
        return;
      }

      setRosterPlayers(result.players);

      // Match form players with roster players
      const updates: FlagUpdate[] = [];

      // Get fresh player names using the callback (avoids stale React Hook Form watch data)
      const currentPlayerNames = getPlayerNames();

      // Debug: Log what we're working with
      console.log("=== RK9 Flag Import Debug ===");
      console.log("Form playerNames:", currentPlayerNames);
      console.log("Roster players count:", result.players.length);
      console.log("Roster players:", result.players.map((p: RosterPlayer) => p.screenName));

      Object.entries(currentPlayerNames).forEach(([playerId, formPlayerName]) => {
        if (!formPlayerName?.trim()) return;

        const normalizedFormName = formPlayerName.trim().toLowerCase();
        console.log(`Checking: "${formPlayerName}" (normalized: "${normalizedFormName}")`);

        // Find matching roster player by screen name (case-insensitive)
        const rosterPlayer = result.players.find(
          (rp: RosterPlayer) =>
            rp.screenName.toLowerCase() === normalizedFormName ||
            `${rp.firstName} ${rp.lastName}`.toLowerCase() === normalizedFormName ||
            rp.firstName.toLowerCase() === normalizedFormName ||
            rp.lastName.toLowerCase() === normalizedFormName
        );

        if (rosterPlayer) {
          console.log(`  MATCHED: ${rosterPlayer.screenName} - ${rosterPlayer.country}`);
        } else {
          console.log(`  NOT FOUND`);
        }

        if (rosterPlayer && rosterPlayer.country) {
          // Check if this player has known flag mappings (prioritize these)
          const knownFlags = getFlagsForPlayer(formPlayerName);

          if (knownFlags) {
            updates.push({
              playerId,
              playerName: formPlayerName,
              flags: knownFlags,
              source: "known",
            });
          } else {
            // Use RK9 country
            // Normalize country code (UK -> GB for ISO standard)
            let countryCode = rosterPlayer.country.toUpperCase();
            if (countryCode === "UK") countryCode = "GB";

            updates.push({
              playerId,
              playerName: formPlayerName,
              flags: [countryCode],
              source: "rk9",
            });
          }
        }
      });

      if (updates.length === 0) {
        setError("No matching players found. Make sure player names in the form match screen names in the roster.");
      } else {
        setPreview(updates);
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    if (!preview) return;

    onImportFlags(
      preview.map((u) => ({
        playerId: u.playerId,
        flags: u.flags,
      }))
    );
    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    setUrl("");
    setError(null);
    setPreview(null);
    setRosterPlayers(null);
    setIsLoading(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="text-xs">
          <Flag className="h-3 w-3 mr-1" />
          Import Flags from RK9
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Flags from RK9 Roster</DialogTitle>
          <DialogDescription>
            Paste an RK9 roster URL to import country flags for matching players.
            Known player mappings are prioritized.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roster-url">RK9 Roster URL</Label>
            <Input
              id="roster-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://rk9.gg/roster/..."
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Format: https://rk9.gg/roster/{"<token>"}
            </p>
          </div>

          {preview && (
            <div className="p-3 text-sm bg-muted rounded-md space-y-2 max-h-64 overflow-y-auto">
              <p className="font-medium">
                Found {preview.length} matching player{preview.length !== 1 ? "s" : ""}:
              </p>
              <ul className="space-y-1">
                {preview.map((update) => (
                  <li key={update.playerId} className="flex items-center gap-2">
                    <span className="font-medium">{update.playerName}</span>
                    <span className="text-muted-foreground">→</span>
                    <span>{update.flags.join(", ")}</span>
                    {update.source === "known" && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        known
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {rosterPlayers && (
                <p className="text-xs text-muted-foreground mt-2">
                  Roster has {rosterPlayers.length} players total
                </p>
              )}
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
                "Fetch Roster"
              )}
            </Button>
          ) : (
            <Button type="button" onClick={handleImport} disabled={isLoading}>
              Import {preview.length} Flag{preview.length !== 1 ? "s" : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
