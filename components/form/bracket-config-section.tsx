"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TournamentData } from "@/lib/types";

interface BracketConfigSectionProps {
  form: UseFormReturn<TournamentData>;
}

// Position configuration for the bracket
const BRACKET_POSITIONS = [
  { key: "first", label: "1st Place (Champion)" },
  { key: "second", label: "2nd Place (Runner-up)" },
  { key: "third", label: "3rd Place" },
  { key: "fourth", label: "4th Place" },
  { key: "fifth1", label: "5th-8th Place (Slot 1)" },
  { key: "fifth2", label: "5th-8th Place (Slot 2)" },
  { key: "fifth3", label: "5th-8th Place (Slot 3)" },
  { key: "fifth4", label: "5th-8th Place (Slot 4)" },
] as const;

export function BracketConfigSection({ form }: BracketConfigSectionProps) {
  const overviewType = form.watch("overviewType");
  const players = form.watch("players");
  const playerOrder = form.watch("playerOrder");
  const bracketPositions = form.watch("bracketPositions");

  // Only show for Bracket mode
  if (overviewType !== "Bracket") {
    return null;
  }

  // Get list of players with their names for the select options
  const playerOptions = React.useMemo(() => {
    return playerOrder
      .map((playerId) => {
        const player = players[playerId];
        return {
          id: playerId,
          name: player?.name?.trim() || `Player ${playerId.replace("player-", "")}`,
        };
      })
      .filter((p) => p.name);
  }, [playerOrder, players]);

  // Get already selected player IDs to show which are taken
  const selectedPlayerIds = React.useMemo(() => {
    if (!bracketPositions) return new Set<string>();
    return new Set(
      Object.values(bracketPositions).filter((id): id is string => id !== null)
    );
  }, [bracketPositions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bracket Positions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground mb-4">
          Select which player finished in each bracket position.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BRACKET_POSITIONS.map((position) => (
            <FormField
              key={position.key}
              control={form.control}
              name={`bracketPositions.${position.key}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{position.label}</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value === "__none__" ? null : value);
                    }}
                    value={field.value ?? "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select player..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">
                        <span className="text-muted-foreground">No player selected</span>
                      </SelectItem>
                      {playerOptions.map((player) => {
                        const isSelected = selectedPlayerIds.has(player.id) && field.value !== player.id;
                        return (
                          <SelectItem
                            key={player.id}
                            value={player.id}
                            disabled={isSelected}
                          >
                            {player.name}
                            {isSelected && " (already selected)"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
