"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { CircleFlag } from "react-circle-flags";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { searchCountries, getCountryName } from "@/data/flags";

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between min-w-0"
        >
          {value ? (
            <div className="flex items-center gap-2 min-w-0">
              <CircleFlag
                countryCode={value.toLowerCase()}
                width={16}
                height={16}
                className="shrink-0"
              />
              <span className="truncate">{getCountryName(value)}</span>
            </div>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
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
              {searchResults.slice(0, 50).map((country) => (
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
                  <CircleFlag
                    countryCode={country.code.toLowerCase()}
                    width={16}
                    height={16}
                    className="mr-2 shrink-0"
                  />
                  <span>{country.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
