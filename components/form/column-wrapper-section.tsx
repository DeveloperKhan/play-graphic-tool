"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TournamentData, ColumnId, ColumnDisplayMode, PlayerCount } from "@/lib/types";
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

// Columns for Top 32 (8 blocks total - 4 players per block)
const COLUMNS_32: ColumnConfig[] = [
  { id: "col1a", label: "Column 1 Top (A-B)", colorIndex: 0, defaultWrapperText: "1st-4th" },
  { id: "col1b", label: "Column 1 Bottom (C-D)", colorIndex: 1, defaultWrapperText: "5th-8th" },
  { id: "col2a", label: "Column 2 Top (E-F)", colorIndex: 2, defaultWrapperText: "9th-12th" },
  { id: "col2b", label: "Column 2 Bottom (G-H)", colorIndex: 3, defaultWrapperText: "13th-16th" },
  { id: "col3a", label: "Column 3 Top (I-J)", colorIndex: 0, defaultWrapperText: "17th-20th" },
  { id: "col3b", label: "Column 3 Bottom (K-L)", colorIndex: 1, defaultWrapperText: "21st-24th" },
  { id: "col4a", label: "Column 4 Top (M-N)", colorIndex: 2, defaultWrapperText: "25th-28th" },
  { id: "col4b", label: "Column 4 Bottom (O-P)", colorIndex: 3, defaultWrapperText: "29th-32nd" },
];

// Columns for Top 64 (16 blocks total - 4 players per block)
// Winners graphic (8 blocks: 2 per column × 4 columns)
const COLUMNS_64_WINNERS: ColumnConfig[] = [
  { id: "winners1a", label: "Winners Col 1 Top (A-B)", colorIndex: 0, defaultWrapperText: "1st-4th" },
  { id: "winners1b", label: "Winners Col 1 Bottom (C-D)", colorIndex: 1, defaultWrapperText: "5th-8th" },
  { id: "winners2a", label: "Winners Col 2 Top (E-F)", colorIndex: 2, defaultWrapperText: "9th-12th" },
  { id: "winners2b", label: "Winners Col 2 Bottom (G-H)", colorIndex: 3, defaultWrapperText: "13th-16th" },
  { id: "winners3a", label: "Winners Col 3 Top (I-J)", colorIndex: 0, defaultWrapperText: "17th-20th" },
  { id: "winners3b", label: "Winners Col 3 Bottom (K-L)", colorIndex: 1, defaultWrapperText: "21st-24th" },
  { id: "winners4a", label: "Winners Col 4 Top (M-N)", colorIndex: 2, defaultWrapperText: "25th-28th" },
  { id: "winners4b", label: "Winners Col 4 Bottom (O-P)", colorIndex: 3, defaultWrapperText: "29th-32nd" },
];

// Losers graphic (8 blocks: 2 per column × 4 columns)
const COLUMNS_64_LOSERS: ColumnConfig[] = [
  { id: "losers1a", label: "Losers Col 1 Top (A-B)", colorIndex: 0, defaultWrapperText: "1st-4th" },
  { id: "losers1b", label: "Losers Col 1 Bottom (C-D)", colorIndex: 1, defaultWrapperText: "5th-8th" },
  { id: "losers2a", label: "Losers Col 2 Top (E-F)", colorIndex: 2, defaultWrapperText: "9th-12th" },
  { id: "losers2b", label: "Losers Col 2 Bottom (G-H)", colorIndex: 3, defaultWrapperText: "13th-16th" },
  { id: "losers3a", label: "Losers Col 3 Top (I-J)", colorIndex: 0, defaultWrapperText: "17th-20th" },
  { id: "losers3b", label: "Losers Col 3 Bottom (K-L)", colorIndex: 1, defaultWrapperText: "21st-24th" },
  { id: "losers4a", label: "Losers Col 4 Top (M-N)", colorIndex: 2, defaultWrapperText: "25th-28th" },
  { id: "losers4b", label: "Losers Col 4 Bottom (O-P)", colorIndex: 3, defaultWrapperText: "29th-32nd" },
];

// Helper functions for show placements defaults
function getFirstWinnersColumnId(playerCount: PlayerCount): ColumnId {
  if (playerCount === 64) return "winners1a";
  if (playerCount === 32) return "col1a";
  return "winners1";
}

function getRemainingWinnersColumnIds(playerCount: PlayerCount): ColumnId[] {
  if (playerCount === 64) {
    return ["winners1b", "winners2a", "winners2b", "winners3a", "winners3b", "winners4a", "winners4b"];
  }
  if (playerCount === 32) {
    return ["col1b", "col2a", "col2b", "col3a", "col3b", "col4a", "col4b"];
  }
  return ["winners2"];
}

function getLosersColumnIds(playerCount: PlayerCount): ColumnId[] {
  if (playerCount === 64) {
    return ["losers1a", "losers1b", "losers2a", "losers2b", "losers3a", "losers3b", "losers4a", "losers4b"];
  }
  if (playerCount === 32) return [];
  return ["losers1", "losers2"];
}

function getAllColumnIds(playerCount: PlayerCount): ColumnId[] {
  return [
    getFirstWinnersColumnId(playerCount),
    ...getRemainingWinnersColumnIds(playerCount),
    ...getLosersColumnIds(playerCount),
  ];
}

function getDefaultWrapperText(columnId: ColumnId): string {
  const allConfigs = [...COLUMNS_16, ...COLUMNS_32, ...COLUMNS_64_WINNERS, ...COLUMNS_64_LOSERS];
  return allConfigs.find((c) => c.id === columnId)?.defaultWrapperText ?? "";
}

export function ColumnWrapperSection({ form }: ColumnWrapperSectionProps) {
  const playerCount = form.watch("playerCount");
  const isTop64 = playerCount === 64;
  const isTop32 = playerCount === 32;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Column Display</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose how to display player columns: pair lines, L-shaped wrapper, or hidden
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isTop64 ? (
          <>
            {/* Winners Graphic Columns */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">Winners Graphic</h4>
              {COLUMNS_64_WINNERS.map((column) => (
                <ColumnWrapperField
                  key={column.id}
                  form={form}
                  columnId={column.id}
                  label={column.label}
                  colorIndex={column.colorIndex}
                  defaultWrapperText={column.defaultWrapperText}
                />
              ))}
            </div>
            {/* Losers Graphic Columns */}
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-semibold text-muted-foreground">Losers Graphic</h4>
              {COLUMNS_64_LOSERS.map((column) => (
                <ColumnWrapperField
                  key={column.id}
                  form={form}
                  columnId={column.id}
                  label={column.label}
                  colorIndex={column.colorIndex}
                  defaultWrapperText={column.defaultWrapperText}
                />
              ))}
            </div>
          </>
        ) : isTop32 ? (
          COLUMNS_32.map((column) => (
            <ColumnWrapperField
              key={column.id}
              form={form}
              columnId={column.id}
              label={column.label}
              colorIndex={column.colorIndex}
              defaultWrapperText={column.defaultWrapperText}
            />
          ))
        ) : (
          COLUMNS_16.map((column) => (
            <ColumnWrapperField
              key={column.id}
              form={form}
              columnId={column.id}
              label={column.label}
              colorIndex={column.colorIndex}
              defaultWrapperText={column.defaultWrapperText}
            />
          ))
        )}
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
  const isFirstColumn = columnId === "winners1" || columnId === "col1a" || columnId === "winners1a";

  // State for show placements confirmation dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingToggleValue, setPendingToggleValue] = useState(false);
  const playerCount = form.watch("playerCount");

  const applyDefaults = (togglingOn: boolean) => {
    if (togglingOn) {
      // Disable bracket labels
      form.setValue("bracketLabels.winners.enabled", false);
      form.setValue("bracketLabels.losers.enabled", false);

      // First winners column → hidden
      const firstCol = getFirstWinnersColumnId(playerCount);
      form.setValue(`columnWrappers.${firstCol}.mode`, "hidden");

      // Remaining winners columns → wrapper
      for (const colId of getRemainingWinnersColumnIds(playerCount)) {
        form.setValue(`columnWrappers.${colId}.mode`, "wrapper");
        const currentText = form.getValues(`columnWrappers.${colId}.text`);
        if (!currentText) {
          form.setValue(`columnWrappers.${colId}.text`, getDefaultWrapperText(colId));
        }
      }

      // All losers columns → wrapper
      for (const colId of getLosersColumnIds(playerCount)) {
        form.setValue(`columnWrappers.${colId}.mode`, "wrapper");
        const currentText = form.getValues(`columnWrappers.${colId}.text`);
        if (!currentText) {
          form.setValue(`columnWrappers.${colId}.text`, getDefaultWrapperText(colId));
        }
      }
    } else {
      // Enable bracket labels
      form.setValue("bracketLabels.winners.enabled", true);
      form.setValue("bracketLabels.losers.enabled", true);

      // All columns → lines
      for (const colId of getAllColumnIds(playerCount)) {
        form.setValue(`columnWrappers.${colId}.mode`, "lines");
      }
    }
  };

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

      {/* Show Placements toggle - only for first column */}
      {isFirstColumn && (
        <FormField
          control={form.control}
          name={`columnWrappers.${columnId}.showPlacements`}
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Switch
                  checked={field.value ?? false}
                  onCheckedChange={(checked) => {
                    setPendingToggleValue(checked);
                    setDialogOpen(true);
                  }}
                />
              </FormControl>
              <FormLabel className="text-sm font-normal cursor-pointer">
                Show Placements
              </FormLabel>
            </FormItem>
          )}
        />
      )}

      {/* Show Placements confirmation dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) setDialogOpen(false);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {pendingToggleValue ? "Enable" : "Disable"} Show Placements?
            </DialogTitle>
            <DialogDescription>
              {pendingToggleValue
                ? "Enabling show placements will also hide bracket labels, set the first winners column to hidden, and switch remaining columns to wrapper mode with placement labels."
                : "Disabling show placements will also re-enable bracket labels and return all columns to lines mode."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => {
              form.setValue(`columnWrappers.${columnId}.showPlacements`, pendingToggleValue);
              setDialogOpen(false);
            }}>
              Skip defaults
            </Button>
            <Button onClick={() => {
              form.setValue(`columnWrappers.${columnId}.showPlacements`, pendingToggleValue);
              applyDefaults(pendingToggleValue);
              setDialogOpen(false);
            }}>
              Apply defaults
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
