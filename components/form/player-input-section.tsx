"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FlagSelector } from "./flag-selector";
import { TeamInput } from "./team-input";
import { RK9ImportDialog } from "./rk9-import-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, X, ChevronDown, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFlagsForPlayer } from "@/lib/player-flag-config";
import type { TournamentData, Pokemon } from "@/lib/types";

interface PlayerInputSectionProps {
  form: UseFormReturn<TournamentData>;
  playerId: string;
  playerNumber: number;
  totalPlayers: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveTo?: (position: number) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function PlayerInputSection({
  form,
  playerId,
  playerNumber,
  totalPlayers,
  isOpen,
  onOpenChange,
  onMoveUp,
  onMoveDown,
  onMoveTo,
  isFirst = false,
  isLast = false,
}: PlayerInputSectionProps) {
  const player = form.watch(`players.${playerId}`);

  if (!player) {
    return null;
  }

  const playerName = player.name?.trim();

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

  // Generate position options for "Move To" submenu
  const positionOptions = React.useMemo(() => {
    const options: number[] = [];
    for (let i = 1; i <= totalPlayers; i++) {
      if (i !== playerNumber) {
        options.push(i);
      }
    }
    return options;
  }, [totalPlayers, playerNumber]);

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <Card id={`player-${playerId}`} className="min-w-0 overflow-hidden">
        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-0">
          <CardTitle className="flex items-center justify-between gap-2 p-6">
            <CollapsibleTrigger asChild>
              <span className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                <span className="shrink-0">Player {playerNumber}</span>
                {playerName && (
                  <span className="font-normal text-muted-foreground truncate">
                    — {playerName}
                  </span>
                )}
              </span>
            </CollapsibleTrigger>
            <span className="flex items-center gap-1 shrink-0">
              {/* Move dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <DropdownMenuItem
                    onClick={() => onMoveUp?.()}
                    disabled={isFirst}
                  >
                    Move Up
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onMoveDown?.()}
                    disabled={isLast}
                  >
                    Move Down
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Move To Position</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                      {positionOptions.map((pos) => (
                        <DropdownMenuItem
                          key={pos}
                          onClick={() => onMoveTo?.(pos)}
                        >
                          Position {pos}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Expand/collapse indicator */}
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
            </span>
          </CardTitle>
        </CardHeader>
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
