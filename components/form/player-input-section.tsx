"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FlagSelector } from "./flag-selector";
import { TeamInput } from "./team-input";
import { RK9ImportDialog } from "./rk9-import-dialog";
import { Button } from "@/components/ui/button";
import { Plus, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFlagsForPlayer } from "@/lib/player-flag-config";
import type { TournamentData, Placement, BracketSide, BracketGroup, Pokemon } from "@/lib/types";

interface PlayerInputSectionProps {
  form: UseFormReturn<TournamentData>;
  playerId: string;
  playerNumber: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLACEMENT_OPTIONS: { value: Placement; label: string }[] = [
  { value: 1, label: "1st Place" },
  { value: 2, label: "2nd Place" },
  { value: 3, label: "3rd Place" },
  { value: 4, label: "4th Place" },
  { value: "5-8", label: "5-8 Place" },
  { value: "9-16", label: "9-16 Place" },
  { value: "17-24", label: "17-24 Place" },
  { value: "25-32", label: "25-32 Place" },
  { value: "33-64", label: "33-64 Place" },
];

const BRACKET_SIDE_OPTIONS: { value: BracketSide; label: string }[] = [
  { value: "Winners", label: "Winners Bracket" },
  { value: "Losers", label: "Losers Bracket" },
];

const GROUP_OPTIONS: { value: BracketGroup; label: string }[] = [
  { value: "A", label: "Group A" },
  { value: "B", label: "Group B" },
  { value: "C", label: "Group C" },
  { value: "D", label: "Group D" },
  { value: "E", label: "Group E" },
  { value: "F", label: "Group F" },
  { value: "G", label: "Group G" },
  { value: "H", label: "Group H" },
  { value: "I", label: "Group I" },
  { value: "J", label: "Group J" },
  { value: "K", label: "Group K" },
  { value: "L", label: "Group L" },
  { value: "M", label: "Group M" },
  { value: "N", label: "Group N" },
  { value: "O", label: "Group O" },
  { value: "P", label: "Group P" },
];

export function PlayerInputSection({
  form,
  playerId,
  playerNumber,
  isOpen,
  onOpenChange,
}: PlayerInputSectionProps) {
  const player = form.watch(`players.${playerId}`);
  const overviewType = form.watch("overviewType");
  const playerCount = form.watch("playerCount");

  if (!player) {
    return null;
  }

  const playerName = player.name?.trim();
  const placement = player.placement;
  const bracketSide = player.bracketSide;
  const group = player.group;

  // Get placement label for display
  const getPlacementLabel = (p: Placement | undefined) => {
    if (p === undefined) return "";
    const option = PLACEMENT_OPTIONS.find((opt) => opt.value === p);
    return option ? option.label.replace(" Place", "") : String(p);
  };

  const flags = player.flags || [""];
  const canAddFlag = flags.length < 2;
  const canRemoveFlag = flags.length > 1;

  // Auto-populate flags when player name matches a known player
  React.useEffect(() => {
    if (!playerName) return;

    const knownFlags = getFlagsForPlayer(playerName);
    if (knownFlags) {
      // Only auto-populate if current flags are empty or just have one empty string
      const currentFlags = player.flags || [""];
      const hasEmptyFlags = currentFlags.length === 1 && currentFlags[0] === "";

      if (hasEmptyFlags) {
        form.setValue(`players.${playerId}.flags`, knownFlags);
      }
    }
  }, [playerName, playerId, form, player.flags]);

  // Determine available groups based on player count
  // Top 64: A-P (16 groups for 32 players per bracket side)
  // Top 32: A-P (16 groups)
  // Top 16 and below: A-H (8 groups)
  const availableGroups = playerCount >= 32
    ? GROUP_OPTIONS
    : GROUP_OPTIONS.slice(0, 8);

  const addFlag = () => {
    if (canAddFlag) {
      form.setValue(`players.${playerId}.flags`, [...flags, ""]);
    }
  };

  const handleRK9Import = (data: { name: string; team: Pokemon[] }) => {
    // Update player name
    form.setValue(`players.${playerId}.name`, data.name);
    // Update team
    form.setValue(`players.${playerId}.team`, data.team);
  };

  const removeFlag = (index: number) => {
    if (canRemoveFlag) {
      const newFlags = flags.filter((_, i) => i !== index);
      form.setValue(`players.${playerId}.flags`, newFlags);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <Card id={`player-${playerId}`} className="min-w-0 overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 min-w-0">
                <span className="shrink-0">Player {playerNumber}</span>
                {playerName && (
                  <span className="font-normal text-muted-foreground truncate">
                    — {playerName}
                  </span>
                )}
                {overviewType === "Bracket" && placement !== undefined && (
                  <span className="shrink-0 text-xs font-normal bg-muted px-2 py-0.5 rounded">
                    {getPlacementLabel(placement)}
                  </span>
                )}
                {overviewType === "Usage" && (bracketSide || group) && (
                  <span className="shrink-0 text-xs font-normal bg-muted px-2 py-0.5 rounded">
                    {bracketSide === "Winners" ? "W" : "L"}-{group}
                  </span>
                )}
              </span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6 min-w-0 pt-0">
            {/* Player Name */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Player Name</FormLabel>
                <RK9ImportDialog onImport={handleRK9Import} />
              </div>
              <FormField
                control={form.control}
                name={`players.${playerId}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Enter player name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Conditional fields based on overview type */}
            {overviewType === "Bracket" ? (
              <FormField
                control={form.control}
                name={`players.${playerId}.placement`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placement</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const placement = isNaN(Number(value))
                          ? value
                          : Number(value);
                        field.onChange(placement as Placement);
                      }}
                      value={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select placement" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PLACEMENT_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={String(option.value)}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <>
                <FormField
                  control={form.control}
                  name={`players.${playerId}.bracketSide`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bracket Side</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bracket side" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BRACKET_SIDE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`players.${playerId}.group`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableGroups.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Flags */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Country Flags (1-2)</FormLabel>
                {canAddFlag && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addFlag}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Flag
                  </Button>
                )}
              </div>
              {flags.map((_, index) => (
                <div key={index} className="flex items-start gap-2 min-w-0">
                  <FormField
                    control={form.control}
                    name={`players.${playerId}.flags.${index}`}
                    render={({ field }) => (
                      <FormItem className="flex-1 min-w-0">
                        <FormControl>
                          <FlagSelector
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder={`Select flag ${index + 1}...`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {canRemoveFlag && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFlag(index)}
                      className="mt-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Team */}
            <TeamInput form={form} playerId={playerId} />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
