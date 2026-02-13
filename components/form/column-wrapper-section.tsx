"use client";

import { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { TournamentData, ColumnId, ColumnDisplayMode } from "@/lib/types";
import { PAIR_COLORS } from "@/components/graphic/player-column";

// Bracket labels section
interface BracketLabelsSectionProps {
  form: UseFormReturn<TournamentData>;
}

export function BracketLabelsSection({ form }: BracketLabelsSectionProps) {
  const winnersEnabled = form.watch("bracketLabels.winners.enabled");
  const losersEnabled = form.watch("bracketLabels.losers.enabled");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Bracket Labels</CardTitle>
        <p className="text-sm text-muted-foreground">
          Toggle and customize the Winners/Losers bracket header labels
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Winners label */}
        <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
          <FormField
            control={form.control}
            name="bracketLabels.winners.enabled"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormLabel className="text-sm font-medium min-w-[120px]">
            Winners Label
          </FormLabel>
          {winnersEnabled && (
            <FormField
              control={form.control}
              name="bracketLabels.winners.text"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      placeholder="Winners Bracket"
                      {...field}
                      className="h-8"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Losers label */}
        <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
          <FormField
            control={form.control}
            name="bracketLabels.losers.enabled"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormLabel className="text-sm font-medium min-w-[120px]">
            Losers Label
          </FormLabel>
          {losersEnabled && (
            <FormField
              control={form.control}
              name="bracketLabels.losers.text"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      placeholder="Losers Bracket"
                      {...field}
                      className="h-8"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ColumnWrapperSectionProps {
  form: UseFormReturn<TournamentData>;
}

interface ColumnConfig {
  id: ColumnId;
  label: string;
  colorIndex: number; // Index into PAIR_COLORS
  defaultWrapperText: string; // Default text when wrapper mode is selected
}

// Columns for Top 16
const COLUMNS_16: ColumnConfig[] = [
  { id: "winners1", label: "Winners Column 1 (A-D)", colorIndex: 0, defaultWrapperText: "1st-4th" },
  { id: "winners2", label: "Winners Column 2 (E-H)", colorIndex: 2, defaultWrapperText: "5th-8th" },
  { id: "losers1", label: "Losers Column 1 (A-D)", colorIndex: 0, defaultWrapperText: "9th-12th" },
  { id: "losers2", label: "Losers Column 2 (E-H)", colorIndex: 2, defaultWrapperText: "13th-16th" },
];

// Columns for Top 64 (8 columns total - 4 winners, 4 losers)
const COLUMNS_64: ColumnConfig[] = [
  { id: "winners1", label: "Winners Col 1 (A-D)", colorIndex: 0, defaultWrapperText: "1st-8th" },
  { id: "winners2", label: "Winners Col 2 (E-H)", colorIndex: 1, defaultWrapperText: "9th-16th" },
  { id: "winners3", label: "Winners Col 3 (I-L)", colorIndex: 2, defaultWrapperText: "17th-24th" },
  { id: "winners4", label: "Winners Col 4 (M-P)", colorIndex: 3, defaultWrapperText: "25th-32nd" },
  { id: "losers1", label: "Losers Col 1 (A-D)", colorIndex: 0, defaultWrapperText: "1st-8th" },
  { id: "losers2", label: "Losers Col 2 (E-H)", colorIndex: 1, defaultWrapperText: "9th-16th" },
  { id: "losers3", label: "Losers Col 3 (I-L)", colorIndex: 2, defaultWrapperText: "17th-24th" },
  { id: "losers4", label: "Losers Col 4 (M-P)", colorIndex: 3, defaultWrapperText: "25th-32nd" },
];

export function ColumnWrapperSection({ form }: ColumnWrapperSectionProps) {
  const playerCount = form.watch("playerCount");

  // Select columns based on player count
  const columns = playerCount === 64 ? COLUMNS_64 : COLUMNS_16;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Column Display</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose how to display player columns: pair lines, L-shaped wrapper, or hidden
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {columns.map((column) => (
          <ColumnWrapperField
            key={column.id}
            form={form}
            columnId={column.id}
            label={column.label}
            colorIndex={column.colorIndex}
            defaultWrapperText={column.defaultWrapperText}
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
  defaultWrapperText: string;
}

function ColumnWrapperField({
  form,
  columnId,
  label,
  colorIndex,
  defaultWrapperText,
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
                  if (value) {
                    field.onChange(value as ColumnDisplayMode);
                    // Set default text when switching to wrapper mode
                    if (value === "wrapper") {
                      const currentText = form.getValues(`columnWrappers.${columnId}.text`);
                      if (!currentText) {
                        form.setValue(`columnWrappers.${columnId}.text`, defaultWrapperText);
                      }
                    }
                  }
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
