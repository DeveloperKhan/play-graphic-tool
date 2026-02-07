"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { TournamentData, EventType, OverviewType } from "@/lib/types";

interface EventInfoSectionProps {
  form: UseFormReturn<TournamentData>;
}

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "Regional", label: "Regional Championship" },
  { value: "Generic", label: "Generic Tournament" },
  { value: "International", label: "International Championship" },
  { value: "Worlds", label: "World Championship" },
];

const OVERVIEW_TYPES: { value: OverviewType; label: string; description: string }[] = [
  { value: "Usage", label: "Usage Statistics", description: "Show top 12 most-used Pokemon" },
  { value: "Bracket", label: "Bracket", description: "Show top 8 double elimination bracket" },
  { value: "None", label: "None", description: "No overview section" },
];

export function EventInfoSection({ form }: EventInfoSectionProps) {
  const overviewType = form.watch("overviewType");
  const showBracketReset = overviewType === "Bracket";

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Event Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 min-w-0">
        {/* Event Name */}
        <FormField
          control={form.control}
          name="eventName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Las Vegas Regional"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Event Year */}
        <FormField
          control={form.control}
          name="eventYear"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Year</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., 2026"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Player Count */}
        <FormField
          control={form.control}
          name="playerCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tournament Size</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={String(field.value)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tournament size" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="4" disabled>
                    Top 4 (Coming Soon)
                  </SelectItem>
                  <SelectItem value="8" disabled>
                    Top 8 (Coming Soon)
                  </SelectItem>
                  <SelectItem value="16">Top 16</SelectItem>
                  <SelectItem value="32" disabled>
                    Top 32 (Coming Soon)
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Event Type */}
        <FormField
          control={form.control}
          name="eventType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Overview Type */}
        <FormField
          control={form.control}
          name="overviewType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Overview Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex flex-col space-y-2"
                >
                  {OVERVIEW_TYPES.map((type) => (
                    <div
                      key={type.value}
                      className="flex items-start space-x-3 space-y-0"
                    >
                      <RadioGroupItem value={type.value} id={type.value} />
                      <div className="space-y-1 leading-none">
                        <Label
                          htmlFor={type.value}
                          className="font-medium cursor-pointer"
                        >
                          {type.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Bracket Reset (only show if Bracket is selected) */}
        {showBracketReset && (
          <FormField
            control={form.control}
            name="bracketReset"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer">
                    Bracket Reset in Grand Finals
                  </FormLabel>
                  <FormDescription>
                    Check this if the grand finals had a bracket reset (loser
                    won first set)
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
