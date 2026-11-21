"use client";

import * as React from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListOrdered, Loader2, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { planReorder, type ReorderPlan } from "@/lib/challonge-reorder";
import type { StandingEntry, StandingsMode } from "@/lib/challonge";

interface BulkMoveDialogProps {
  playerOrder: string[];
  playerNames: Record<string, string>;
  onBulkReorder: (newOrder: string[]) => void;
}

/** What the bracket this order came from was, shown so the ordering can be judged */
interface BracketSummary {
  eventName: string;
  mode: StandingsMode;
  plan: ReorderPlan;
}

/** Names from a list, trimmed to a readable length */
function nameList(names: string[], limit = 4): string {
  if (names.length <= limit) return names.join(", ");
  return `${names.slice(0, limit).join(", ")} and ${names.length - limit} more`;
}

export function BulkMoveDialog({
  playerOrder,
  playerNames,
  onBulkReorder,
}: BulkMoveDialogProps) {
  const [open, setOpen] = React.useState(false);
  // Track assignments: position index -> playerId
  const [assignments, setAssignments] = React.useState<Record<number, string>>({});

  // Ordering from a Challonge bracket
  const [challongeUrl, setChallongeUrl] = React.useState("");
  const [isFetching, setIsFetching] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<BracketSummary | null>(null);

  // Reset assignments when dialog opens
  React.useEffect(() => {
    if (open) {
      // Initialize with current order
      const initial: Record<number, string> = {};
      playerOrder.forEach((playerId, index) => {
        initial[index] = playerId;
      });
      setAssignments(initial);
      setFetchError(null);
      setSummary(null);
    }
  }, [open, playerOrder]);

  // Get list of available players for a given position
  // A player is available if not assigned elsewhere
  const getAvailablePlayers = (positionIndex: number) => {
    const assignedElsewhere = new Set(
      Object.entries(assignments)
        .filter(([idx]) => Number(idx) !== positionIndex)
        .map(([, playerId]) => playerId)
    );
    return playerOrder.filter((id) => !assignedElsewhere.has(id));
  };

  const handleAssign = (positionIndex: number, playerId: string) => {
    setAssignments((prev) => ({
      ...prev,
      [positionIndex]: playerId,
    }));
  };

  /**
   * Fill the positions below from a Challonge bracket.
   *
   * The bracket supplies only the ordering - names, flags and teams in the form
   * are left as they are - so the result is reviewed in the same grid as a
   * reorder done by hand, and applied with the same button.
   */
  const handleOrderFromChallonge = async () => {
    const url = challongeUrl.trim();
    if (!url) {
      setFetchError("A Challonge URL is required");
      return;
    }

    setIsFetching(true);
    setFetchError(null);
    setSummary(null);

    try {
      const response = await fetch("/api/challonge-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const result = await response.json();

      if (!result.success) {
        setFetchError(result.error || "Failed to load the Challonge tournament");
        return;
      }

      const entries: StandingEntry[] = result.entries;
      const plan = planReorder(
        entries,
        playerOrder.map((id) => ({ id, name: playerNames[id] ?? "" }))
      );

      if (plan.matched.length === 0) {
        setFetchError(
          `None of the ${playerOrder.length} players in the form appear in this bracket ` +
            `(${entries.length} entries). Check it is the right event.`
        );
        return;
      }

      const next: Record<number, string> = {};
      plan.order.forEach((playerId, index) => {
        next[index] = playerId;
      });
      setAssignments(next);
      setSummary({
        eventName: result.tournament?.name ?? "",
        mode: result.mode,
        plan,
      });
    } catch {
      setFetchError("Failed to connect to server");
    } finally {
      setIsFetching(false);
    }
  };

  const handleApply = () => {
    // Get assigned player IDs
    const assignedPlayerIds = new Set(Object.values(assignments));

    // Get unassigned players and shuffle them randomly
    const unassignedPlayers = playerOrder.filter((id) => !assignedPlayerIds.has(id));
    for (let i = unassignedPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unassignedPlayers[i], unassignedPlayers[j]] = [unassignedPlayers[j], unassignedPlayers[i]];
    }

    // Build new order, filling empty slots with shuffled unassigned players
    const newOrder: string[] = [];
    let unassignedIndex = 0;

    for (let i = 0; i < playerOrder.length; i++) {
      if (assignments[i]) {
        newOrder.push(assignments[i]);
      } else {
        // Fill empty slot with next shuffled unassigned player
        newOrder.push(unassignedPlayers[unassignedIndex++]);
      }
    }

    onBulkReorder(newOrder);
    setOpen(false);
  };

  const handleClear = (positionIndex: number) => {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[positionIndex];
      return next;
    });
  };

  const handleClearAll = () => {
    setAssignments({});
  };

  // Get player display name
  const getPlayerLabel = (playerId: string, index?: number) => {
    const name = playerNames[playerId]?.trim();
    const num = index !== undefined ? index + 1 : playerOrder.indexOf(playerId) + 1;
    return name || `Player ${num}`;
  };

  // Count assigned positions
  const assignedCount = Object.keys(assignments).length;

  const closeMatches = summary?.plan.matched.filter((m) => m.kind === "close") ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
        >
          <ListOrdered className="h-3 w-3 mr-1" />
          Bulk Reorder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Bulk Reorder Players</DialogTitle>
          <DialogDescription>
            Order the players from a Challonge bracket, or assign them to positions
            yourself. Empty slots will be randomly filled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-md border p-3">
          <Label htmlFor="reorder-challonge-url" className="text-sm">
            Order from a Challonge bracket
          </Label>
          <div className="flex gap-2">
            <Input
              id="reorder-challonge-url"
              type="url"
              value={challongeUrl}
              onChange={(e) => setChallongeUrl(e.target.value)}
              placeholder="https://pokemongochampionshipseries.challonge.com/..."
              disabled={isFetching}
              className="h-8 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleOrderFromChallonge();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              onClick={handleOrderFromChallonge}
              disabled={isFetching || !challongeUrl.trim()}
              className="shrink-0 text-xs"
            >
              {isFetching ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Reading...
                </>
              ) : (
                "Order players"
              )}
            </Button>
          </div>

          {fetchError && (
            <p className="text-xs text-destructive">{fetchError}</p>
          )}

          {summary && (
            <div className="space-y-1 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-blue-700 dark:text-blue-400">
                  {summary.mode === "final" ? "Final standings" : "Day 2 pairings"}
                </span>
                {summary.eventName && (
                  <span className="text-muted-foreground">{summary.eventName}</span>
                )}
              </div>
              <p className="text-muted-foreground">
                Placed {summary.plan.matched.length} of {playerOrder.length} players.
                {summary.mode === "pairings" &&
                  " Each pair of positions is one live matchup."}
              </p>
              {closeMatches.length > 0 && (
                <p className="text-amber-700 dark:text-amber-400">
                  Matched on a near spelling:{" "}
                  {nameList(
                    closeMatches.map((m) => `${m.entryName} → ${m.playerName}`)
                  )}
                </p>
              )}
              {summary.plan.unmatched.length > 0 && (
                <p className="text-muted-foreground">
                  Not in this bracket, left at the end:{" "}
                  {nameList(
                    summary.plan.unmatched.map(
                      (p) => p.name.trim() || `Player ${playerOrder.indexOf(p.id) + 1}`
                    )
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Assigned: {assignedCount} / {playerOrder.length}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="text-xs"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-2 gap-3">
            {playerOrder.map((_, positionIndex) => {
              const assignedPlayer = assignments[positionIndex];
              const availablePlayers = getAvailablePlayers(positionIndex);

              return (
                <div
                  key={positionIndex}
                  className="flex items-center gap-2"
                >
                  <span className="w-8 text-sm font-medium text-muted-foreground shrink-0">
                    #{positionIndex + 1}
                  </span>
                  <Select
                    value={assignedPlayer || "__empty__"}
                    onValueChange={(value) => {
                      if (value === "__empty__") {
                        handleClear(positionIndex);
                      } else {
                        handleAssign(positionIndex, value);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Select player..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__empty__">
                        <span className="text-muted-foreground">-- Empty --</span>
                      </SelectItem>
                      {availablePlayers.map((playerId) => (
                        <SelectItem key={playerId} value={playerId}>
                          {getPlayerLabel(playerId)}
                        </SelectItem>
                      ))}
                      {/* Show currently assigned player if not in available list */}
                      {assignedPlayer && !availablePlayers.includes(assignedPlayer) && (
                        <SelectItem key={assignedPlayer} value={assignedPlayer}>
                          {getPlayerLabel(assignedPlayer)}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleApply}>
            Apply Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
