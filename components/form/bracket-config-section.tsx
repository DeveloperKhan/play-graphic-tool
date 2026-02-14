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

// Bracket position groups organized by round
const BRACKET_SECTIONS = [
  {
    title: "Winners Semifinals",
    positions: [
      { key: "winnersSemis1Top", label: "Match 1 - Top" },
      { key: "winnersSemis1Bottom", label: "Match 1 - Bottom" },
      { key: "winnersSemis2Top", label: "Match 2 - Top" },
      { key: "winnersSemis2Bottom", label: "Match 2 - Bottom" },
    ],
  },
  {
    title: "Winners Finals",
    positions: [
      { key: "winnersFinalsTop", label: "Top" },
      { key: "winnersFinalsBottom", label: "Bottom" },
    ],
  },
  {
    title: "Losers Round 1",
    positions: [
      { key: "losersR1Match1Top", label: "Match 1 - Top" },
      { key: "losersR1Match1Bottom", label: "Match 1 - Bottom" },
      { key: "losersR1Match2Top", label: "Match 2 - Top" },
      { key: "losersR1Match2Bottom", label: "Match 2 - Bottom" },
    ],
  },
  {
    title: "Losers Round 2",
    positions: [
      { key: "losersR2Top", label: "Top" },
      { key: "losersR2Bottom", label: "Bottom" },
    ],
  },
  {
    title: "Losers Round 3",
    positions: [
      { key: "losersR3Top", label: "Top" },
      { key: "losersR3Bottom", label: "Bottom" },
    ],
  },
  {
    title: "Losers Semifinals",
    positions: [
      { key: "losersSemisTop", label: "Top" },
      { key: "losersSemisBottom", label: "Bottom" },
    ],
  },
  {
    title: "Losers Finals",
    positions: [
      { key: "losersFinalsTop", label: "Top" },
      { key: "losersFinalsBottom", label: "Bottom" },
    ],
  },
  {
    title: "Grand Finals",
    positions: [
      { key: "grandFinalsWinners", label: "From Winners" },
      { key: "grandFinalsLosers", label: "From Losers" },
    ],
  },
  {
    title: "Champion",
    positions: [
      { key: "champion", label: "Champion" },
    ],
  },
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
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Select which player appears in each bracket cell.
        </p>
        {BRACKET_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-3">
            <h4 className="font-medium text-sm">{section.title}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {section.positions.map((position) => (
                <FormField
                  key={position.key}
                  control={form.control}
                  name={`bracketPositions.${position.key}` as `bracketPositions.${keyof typeof bracketPositions}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{position.label}</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value === "__none__" ? null : value);
                        }}
                        value={(field.value as string | null) ?? "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9">
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
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
