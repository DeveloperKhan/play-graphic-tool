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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListOrdered, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BulkMoveDialogProps {
  playerOrder: string[];
  playerNames: Record<string, string>;
  onBulkReorder: (newOrder: string[]) => void;
}

export function BulkMoveDialog({
  playerOrder,
  playerNames,
  onBulkReorder,
}: BulkMoveDialogProps) {
  const [open, setOpen] = React.useState(false);
  // Track assignments: position index -> playerId
  const [assignments, setAssignments] = React.useState<Record<number, string>>({});

  // Reset assignments when dialog opens
  React.useEffect(() => {
    if (open) {
      // Initialize with current order
      const initial: Record<number, string> = {};
      playerOrder.forEach((playerId, index) => {
        initial[index] = playerId;
      });
      setAssignments(initial);
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
            Assign players to specific positions. Empty slots will be randomly filled.
          </DialogDescription>
        </DialogHeader>

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
