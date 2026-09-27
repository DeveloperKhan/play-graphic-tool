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
import type { TournamentData, ColumnId, ColumnDisplayMode } from "@/lib/types";
import { PAIR_COLORS } from "@/components/graphic/player-column";
import {
  COLUMNS_16,
  COLUMNS_32,
  COLUMNS_64_WINNERS,
  COLUMNS_64_LOSERS,
  getAllColumnIds,
  getDefaultWrapperText,
  getFirstWinnersColumnId,
  getLosersColumnIds,
  getRemainingWinnersColumnIds,
} from "@/lib/column-wrapper-defaults";

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
