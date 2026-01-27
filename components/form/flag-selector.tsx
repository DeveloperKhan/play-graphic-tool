"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { searchCountries, getCountryName } from "@/data/flags";
import * as flags from "country-flag-icons/react/3x2";

interface FlagSelectorProps {
  value: string; // Country code (e.g., "US")
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function FlagSelector({
  value,
  onValueChange,
  placeholder = "Select country...",
}: FlagSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const searchResults = searchCountries(searchQuery);

  const handleSelect = (countryCode: string) => {
    onValueChange(countryCode === value ? "" : countryCode);
    setOpen(false);
  };

  // Get the flag component for the selected country
  const FlagComponent = value
    ? (flags as Record<string, React.ComponentType<{ className?: string }>>)[value]
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value && FlagComponent ? (
            <div className="flex items-center gap-2">
              <FlagComponent className="h-4 w-6 rounded-sm" />
              <span>{getCountryName(value)}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search countries..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {searchResults.slice(0, 50).map((country) => {
                const CountryFlag = (
                  flags as Record<string, React.ComponentType<{ className?: string }>>
                )[country.code];

                return (
                  <CommandItem
                    key={country.code}
                    value={country.code}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === country.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {CountryFlag && (
                      <CountryFlag className="mr-2 h-4 w-6 rounded-sm" />
                    )}
                    <span>{country.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
