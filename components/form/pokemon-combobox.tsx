"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { searchPokemon, getPokemonSpriteBySid, getPokemonById } from "@/lib/pokemon-data";
import type { PokemonMetadata } from "@/lib/types";
import Image from "next/image";

interface PokemonComboboxProps {
  value: string; // Pokemon speciesId
  isShadow: boolean;
  onValueChange: (value: string) => void;
  onShadowChange: (isShadow: boolean) => void;
  placeholder?: string;
}

export function PokemonCombobox({
  value,
  isShadow,
  onValueChange,
  onShadowChange,
  placeholder = "Select Pokemon...",
}: PokemonComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<PokemonMetadata[]>([]);
  const [selectedPokemon, setSelectedPokemon] = React.useState<PokemonMetadata | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Load selected Pokemon data
  React.useEffect(() => {
    if (value) {
      getPokemonById(value).then((pokemon) => {
        setSelectedPokemon(pokemon);
      });
    } else {
      setSelectedPokemon(null);
    }
  }, [value]);

  // Search Pokemon when query changes
  React.useEffect(() => {
    if (open) {
      setIsLoading(true);
      searchPokemon(searchQuery, 50).then((results) => {
        setSearchResults(results);
        setIsLoading(false);
      });
    }
  }, [searchQuery, open]);

  const handleSelect = (pokemonId: string) => {
    onValueChange(pokemonId === value ? "" : pokemonId);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange("");
    onShadowChange(false);
    setSelectedPokemon(null);
  };

  return (
    <div className="flex gap-3">
      {/* Pokemon Image - Left Side */}
      <div className="shrink-0 w-24 h-24 border rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden p-2">
        {selectedPokemon ? (
          <Image
            src={getPokemonSpriteBySid(selectedPokemon.sid)}
            alt={selectedPokemon.speciesName}
            width={80}
            height={80}
            className={cn(
              "object-contain max-w-full max-h-full",
              isShadow && "brightness-75 contrast-125"
            )}
          />
        ) : (
          <div className="text-muted-foreground text-xs text-center px-2">
            No Pokemon
          </div>
        )}
      </div>

      {/* Pokemon Selector and Shadow Toggle - Right Side */}
      <div className="flex-1 space-y-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedPokemon ? (
                <span>{selectedPokemon.speciesName}</span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              <div className="flex items-center gap-1">
                {value && (
                  <X
                    className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                    onClick={handleClear}
                  />
                )}
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-75 p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search Pokemon..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList className="max-h-75 overflow-y-auto">
                <CommandEmpty>
                  {isLoading ? "Loading..." : "No Pokemon found."}
                </CommandEmpty>
                <CommandGroup>
                  {searchResults.map((pokemon) => (
                    <CommandItem
                      key={pokemon.speciesId}
                      value={pokemon.speciesId}
                      onSelect={handleSelect}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === pokemon.speciesId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <Image
                        src={getPokemonSpriteBySid(pokemon.sid)}
                        alt={pokemon.speciesName}
                        width={24}
                        height={24}
                        className="mr-2"
                      />
                      <span>{pokemon.speciesName}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {value && (
          <Toggle
            pressed={isShadow}
            onPressedChange={onShadowChange}
            aria-label="Toggle shadow"
            size="sm"
            className="w-full"
          >
            <span className="text-xs">Shadow</span>
          </Toggle>
        )}
      </div>
    </div>
  );
}
