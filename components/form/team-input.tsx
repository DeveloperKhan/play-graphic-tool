"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { PokemonCombobox } from "./pokemon-combobox";
import type { TournamentData } from "@/lib/types";

interface TeamInputProps {
  form: UseFormReturn<TournamentData>;
  playerId: string;
}

export function TeamInput({ form, playerId }: TeamInputProps) {
  const player = form.watch(`players.${playerId}`);

  if (!player) {
    return null;
  }

  return (
    <div className="space-y-4">
      <FormLabel>Team (6 Pokemon)</FormLabel>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <FormField
            key={index}
            control={form.control}
            name={`players.${playerId}.team.${index}.id`}
            render={({ field }) => (
              <FormItem>
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
