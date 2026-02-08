"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { PokemonCombobox } from "./pokemon-combobox";
import { sortTeam } from "@/lib/pokemon-sort";
import type { TournamentData, Pokemon } from "@/lib/types";

interface TeamInputProps {
  form: UseFormReturn<TournamentData>;
  playerId: string;
}

export function TeamInput({ form, playerId }: TeamInputProps) {
  const [isSorting, setIsSorting] = React.useState(false);
  const player = form.watch(`players.${playerId}`);

  const handleSort = async () => {
    // Get a snapshot of the current team (not the reactive watched value)
    const currentTeam = form.getValues(`players.${playerId}.team`) as Pokemon[];
    if (!currentTeam) return;

    setIsSorting(true);
    try {
      const sortedTeam = await sortTeam(currentTeam);
      // Update each Pokemon slot in the form
      for (let index = 0; index < sortedTeam.length; index++) {
        const pokemon = sortedTeam[index];
        form.setValue(`players.${playerId}.team.${index}.id`, pokemon.id);
        form.setValue(`players.${playerId}.team.${index}.isShadow`, pokemon.isShadow);
      }
    } finally {
      setIsSorting(false);
    }
  };

  if (!player) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FormLabel>Team (6 Pokemon)</FormLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSort}
          disabled={isSorting}
        >
          {isSorting ? "Sorting..." : "Sort Pokemon"}
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <FormField
            key={index}
            control={form.control}
            name={`players.${playerId}.team.${index}.id`}
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel className="text-xs text-muted-foreground">
                  Pokemon {index + 1}
                </FormLabel>
                <FormControl>
                  <PokemonCombobox
                    value={field.value}
                    isShadow={
                      form.watch(
                        `players.${playerId}.team.${index}.isShadow`
                      ) || false
                    }
                    onValueChange={field.onChange}
                    onShadowChange={(isShadow) =>
                      form.setValue(
                        `players.${playerId}.team.${index}.isShadow`,
                        isShadow
                      )
                    }
                    placeholder={`Select Pokemon ${index + 1}...`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>
    </div>
  );
}
