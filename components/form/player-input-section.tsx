"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlagSelector } from "./flag-selector";
import { TeamInput } from "./team-input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { TournamentData, Placement } from "@/lib/types";

interface PlayerInputSectionProps {
  form: UseFormReturn<TournamentData>;
  playerId: string;
  playerNumber: number;
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
];

export function PlayerInputSection({
  form,
  playerId,
  playerNumber,
}: PlayerInputSectionProps) {
  const player = form.watch(`players.${playerId}`);

  if (!player) {
    return null;
  }

  const flags = player.flags || [""];
  const canAddFlag = flags.length < 2;
  const canRemoveFlag = flags.length > 1;

  const addFlag = () => {
    if (canAddFlag) {
      form.setValue(`players.${playerId}.flags`, [...flags, ""]);
    }
  };

  const removeFlag = (index: number) => {
    if (canRemoveFlag) {
      const newFlags = flags.filter((_, i) => i !== index);
      form.setValue(`players.${playerId}.flags`, newFlags);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Player {playerNumber}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Player Name */}
        <FormField
          control={form.control}
          name={`players.${playerId}.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Player Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter player name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Placement */}
        <FormField
          control={form.control}
          name={`players.${playerId}.placement`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Placement</FormLabel>
              <Select
                onValueChange={(value) => {
                  // Handle both number and string placements
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
            <div key={index} className="flex items-start gap-2">
              <FormField
                control={form.control}
                name={`players.${playerId}.flags.${index}`}
                render={({ field }) => (
                  <FormItem className="flex-1">
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
    </Card>
  );
}
