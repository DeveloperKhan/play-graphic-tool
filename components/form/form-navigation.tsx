"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ArrowUpDown, Sparkles, RotateCcw, Copy, Upload, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImportDialog } from "./import-dialog";
import { RK9RosterImportDialog } from "./rk9-roster-import-dialog";
import { BulkMoveDialog } from "./bulk-move-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ImportedPlayer {
  name: string;
  flags: string[];
  team: Array<{ id: string; isShadow: boolean }>;
}

interface FormNavigationProps {
  playerOrder: string[];
  playerNames: Record<string, string>;
  getPlayerNames: () => Record<string, string>;
  activeSection: string | null;
  onNavigate: (sectionId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onSortPlayers: () => void;
  onSortAllPokemon: () => void;
  onImport: (players: ImportedPlayer[]) => void;
  onImportFlags: (updates: Array<{ playerId: string; flags: string[] }>) => void;
  onBulkReorder: (newOrder: string[]) => void;
  onResetForm: () => void;
  onCopyJson: () => Promise<boolean>;
  onImportJson: (json: string) => boolean;
  isSortingPokemon?: boolean;
}

export function FormNavigation({
  playerOrder,
  playerNames,
  getPlayerNames,
  activeSection,
  onNavigate,
  onExpandAll,
  onCollapseAll,
  onSortPlayers,
  onSortAllPokemon,
  onImport,
  onImportFlags,
  onBulkReorder,
  onResetForm,
  onCopyJson,
  onImportJson,
  isSortingPokemon = false,
}: FormNavigationProps) {
  const [copied, setCopied] = React.useState(false);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  const [importJson, setImportJson] = React.useState("");
  const [importError, setImportError] = React.useState<string | null>(null);

  const handleCopy = async () => {
    const success = await onCopyJson();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleImportJson = () => {
    setImportError(null);
    const success = onImportJson(importJson);
    if (success) {
      setImportDialogOpen(false);
      setImportJson("");
    } else {
      setImportError("Invalid JSON format. Please check and try again.");
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4 mb-4 pt-1">
      {/* Row 1: Expand/Collapse and Sort buttons */}
      <div className="flex gap-2 mb-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExpandAll}
          className="text-xs"
        >
          <ChevronDown className="h-3 w-3 mr-1" />
          Expand All
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCollapseAll}
          className="text-xs"
        >
          <ChevronUp className="h-3 w-3 mr-1" />
          Collapse All
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSortPlayers}
          className="text-xs"
        >
          <ArrowUpDown className="h-3 w-3 mr-1" />
          Sort Players
        </Button>
        <BulkMoveDialog
          playerOrder={playerOrder}
          playerNames={playerNames}
          onBulkReorder={onBulkReorder}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSortAllPokemon}
          disabled={isSortingPokemon}
          className="text-xs"
        >
          <Sparkles className="h-3 w-3 mr-1" />
          {isSortingPokemon ? "Sorting..." : "Sort All Pokemon"}
        </Button>
      </div>

      {/* Row 2: Import/Export buttons */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <ImportDialog onImport={onImport} />
        <RK9RosterImportDialog getPlayerNames={getPlayerNames} onImportFlags={onImportFlags} />

        {/* Import JSON Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <Upload className="h-3 w-3 mr-1" />
              Import JSON
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Import Form Data</DialogTitle>
              <DialogDescription>
                Paste previously exported JSON data to restore form state.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Paste JSON here..."
                value={importJson}
                onChange={(e) => {
                  setImportJson(e.target.value);
                  setImportError(null);
                }}
                className="min-h-[200px] font-mono text-xs"
              />
              {importError && (
                <p className="text-sm text-destructive">{importError}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setImportDialogOpen(false);
                  setImportJson("");
                  setImportError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleImportJson}>
                Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Copy JSON Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="text-xs"
        >
          {copied ? (
            <Check className="h-3 w-3 mr-1" />
          ) : (
            <Copy className="h-3 w-3 mr-1" />
          )}
          {copied ? "Copied!" : "Copy JSON"}
        </Button>

        {/* Reset Form Dialog */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs text-destructive hover:text-destructive"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Form Data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear all form data and reset to defaults. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onResetForm}>
                Reset Form
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Navigation chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 -mb-1">
        <button
          type="button"
          onClick={() => onNavigate("event-info")}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            activeSection === "event-info"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          Event
        </button>
        {playerOrder.map((playerId, index) => {
          const playerNum = index + 1;
          const playerName = playerNames[playerId];
          const label = playerName ? `P${playerNum}` : `P${playerNum}`;
          const title = playerName || `Player ${playerNum}`;

          return (
            <button
              key={playerId}
              type="button"
              onClick={() => onNavigate(playerId)}
              title={title}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                activeSection === playerId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
