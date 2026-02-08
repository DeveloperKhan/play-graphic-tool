"use client";

import { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { TournamentData, ColumnId, ColumnDisplayMode } from "@/lib/types";
import { PAIR_COLORS } from "@/components/graphic/player-column";

interface ColumnWrapperSectionProps {
  form: UseFormReturn<TournamentData>;
}

interface ColumnConfig {
  id: ColumnId;
  label: string;
  colorIndex: number; // Index into PAIR_COLORS
}

const COLUMNS: ColumnConfig[] = [
  { id: "winners1", label: "Winners Column 1 (A-D)", colorIndex: 0 },
  { id: "winners2", label: "Winners Column 2 (E-H)", colorIndex: 2 },
  { id: "losers1", label: "Losers Column 1 (A-D)", colorIndex: 0 },
  { id: "losers2", label: "Losers Column 2 (E-H)", colorIndex: 2 },
];

export function ColumnWrapperSection({ form }: ColumnWrapperSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Column Display</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose how to display player columns: pair lines, L-shaped wrapper, or hidden
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {COLUMNS.map((column) => (
          <ColumnWrapperField
            key={column.id}
            form={form}
            columnId={column.id}
            label={column.label}
            colorIndex={column.colorIndex}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface ColumnWrapperFieldProps {
  form: UseFormReturn<TournamentData>;
  columnId: ColumnId;
  label: string;
  colorIndex: number;
}

function ColumnWrapperField({
  form,
  columnId,
  label,
  colorIndex,
}: ColumnWrapperFieldProps) {
  const mode = form.watch(`columnWrappers.${columnId}.mode`);
  const color = PAIR_COLORS[colorIndex];

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
      {/* Color indicator */}
      <div
        className="w-3 h-8 rounded-sm shrink-0"
        style={{ backgroundColor: color }}
      />

      {/* Column label */}
      <FormLabel className="text-sm font-medium min-w-[160px]">
        {label}
      </FormLabel>

      {/* Mode selector */}
      <FormField
        control={form.control}
        name={`columnWrappers.${columnId}.mode`}
        render={({ field }) => (
          <FormItem className="flex items-center gap-2 space-y-0">
            <FormControl>
              <ToggleGroup
                type="single"
                value={field.value}
                onValueChange={(value) => {
                  if (value) field.onChange(value as ColumnDisplayMode);
                }}
                className="justify-start"
              >
                <ToggleGroupItem value="lines" aria-label="Show pair lines" className="text-xs px-3">
                  Lines
                </ToggleGroupItem>
                <ToggleGroupItem value="wrapper" aria-label="Show wrapper" className="text-xs px-3">
                  Wrapper
                </ToggleGroupItem>
                <ToggleGroupItem value="hidden" aria-label="Hide all" className="text-xs px-3">
                  Hidden
                </ToggleGroupItem>
              </ToggleGroup>
            </FormControl>
          </FormItem>
        )}
      />

      {/* Text input - only shown when wrapper mode */}
      {mode === "wrapper" && (
        <FormField
          control={form.control}
          name={`columnWrappers.${columnId}.text`}
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input
                  placeholder="Wrapper label text..."
                  {...field}
                  className="h-8"
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
