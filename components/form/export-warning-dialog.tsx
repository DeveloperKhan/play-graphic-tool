"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { TournamentData } from "@/lib/types";

interface ExportWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentData: TournamentData | null;
  onProceed: () => void;
}

interface CheckItem {
  id: string;
  label: string;
  checked: boolean;
  isManual: boolean;
}

export function ExportWarningDialog({
  open,
  onOpenChange,
  tournamentData,
  onProceed,
}: ExportWarningDialogProps) {
  const [pokemonSorted, setPokemonSorted] = useState(false);

  // Check if all players have at least one flag
  const allPlayersHaveFlags = useMemo(() => {
    if (!tournamentData) return false;
    const players = Object.values(tournamentData.players);
    if (players.length === 0) return false;
    return players.every(
      (player) => player.flags.length > 0 && player.flags.some((f) => f.length > 0)
    );
  }, [tournamentData]);

  // Check if champion slot is filled (only relevant for Bracket mode)
  const championSlotFilled = useMemo(() => {
    if (!tournamentData) return false;
    if (tournamentData.overviewType !== "Bracket") return true; // Not applicable
    return tournamentData.bracketPositions?.champion != null;
  }, [tournamentData]);

  const isBracketMode = tournamentData?.overviewType === "Bracket";

  const checkItems: CheckItem[] = useMemo(() => {
    const items: CheckItem[] = [
      {
        id: "flags",
        label: "All players have flags",
        checked: allPlayersHaveFlags,
        isManual: false,
      },
    ];

    if (isBracketMode) {
      items.push({
        id: "champion",
        label: "Champion slot is filled",
        checked: championSlotFilled,
        isManual: false,
      });
    }

    items.push({
      id: "sorted",
      label: "Pokemon teams are sorted",
      checked: pokemonSorted,
      isManual: true,
    });

    return items;
  }, [allPlayersHaveFlags, championSlotFilled, isBracketMode, pokemonSorted]);

  const hasWarnings = checkItems.some((item) => !item.checked);

  const handleProceed = () => {
    onOpenChange(false);
    onProceed();
  };

  const handleClose = () => {
    onOpenChange(false);
    setPokemonSorted(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasWarnings && (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
            Export Checklist
          </DialogTitle>
          <DialogDescription>
            Review the following items before exporting. You can proceed even if some items are unchecked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {checkItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3"
            >
              {item.isManual ? (
                <Checkbox
                  id={item.id}
                  checked={item.checked}
                  onCheckedChange={(checked) => {
                    if (item.id === "sorted") {
                      setPokemonSorted(checked === true);
                    }
                  }}
                />
              ) : (
                <div className="flex h-4 w-4 items-center justify-center">
                  {item.checked ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              )}
              <label
                htmlFor={item.isManual ? item.id : undefined}
                className={`text-sm ${
                  item.checked ? "text-foreground" : "text-muted-foreground"
                } ${item.isManual ? "cursor-pointer" : ""}`}
              >
                {item.label}
              </label>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleProceed}>
            Proceed with Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
