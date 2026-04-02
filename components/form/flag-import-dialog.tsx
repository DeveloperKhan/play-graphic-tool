"use client";

import * as React from "react";
import { Flag, Loader2, ArrowLeftRight, AlertTriangle } from "lucide-react";
import { CircleFlag } from "react-circle-flags";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFlagsForPlayer } from "@/lib/player-flag-config";
import { getCountryName } from "@/data/flags";

type FlagSource = "known" | "dracoviz" | "rk9";

interface PlayerFlagData {
  playerId: string;
  playerName: string;
  selectedFlags: string[];
  selectedSource: FlagSource | null;
  knownFlags: string[] | null;
  dracovizFlags: string[] | null;
  rk9Flags: string[] | null;
}

interface RosterPlayer {
  firstName: string;
  lastName: string;
  screenName: string;
  country: string;
}

interface FlagImportDialogProps {
  getPlayerNames: () => Record<string, string>;
  onImportFlags: (
    updates: Array<{ playerId: string; flags: string[] }>
  ) => void;
}

function normalizeCountryCode(code: string): string {
  let normalized = code.toUpperCase();
  if (normalized === "UK") normalized = "GB";
  return normalized;
}

function resolveSource(data: PlayerFlagData): {
  flags: string[];
  source: FlagSource | null;
} {
  if (data.knownFlags) return { flags: data.knownFlags, source: "known" };
  if (data.dracovizFlags)
    return { flags: data.dracovizFlags, source: "dracoviz" };
  if (data.rk9Flags) return { flags: data.rk9Flags, source: "rk9" };
  return { flags: [], source: null };
}

function getNextSource(
  current: FlagSource | null,
  data: PlayerFlagData
): { flags: string[]; source: FlagSource } | null {
  const sources: Array<{ key: FlagSource; flags: string[] | null }> = [
    { key: "dracoviz", flags: data.dracovizFlags },
    { key: "rk9", flags: data.rk9Flags },
  ];

  const available = sources.filter(
    (s) => s.flags !== null && s.key !== current
  );
  if (available.length === 0) return null;
  return { flags: available[0].flags!, source: available[0].key };
}

function canSwap(data: PlayerFlagData): boolean {
  if (data.selectedSource === "known") return false;
  const sourceCount = [data.dracovizFlags, data.rk9Flags].filter(
    (f) => f !== null
  ).length;
  return sourceCount > 1;
}

const SOURCE_STYLES: Record<FlagSource, string> = {
  known: "bg-green-500/10 text-green-700 dark:text-green-400",
  dracoviz: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  rk9: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
};

const SOURCE_LABELS: Record<FlagSource, string> = {
  known: "Known",
  dracoviz: "Dracoviz",
  rk9: "RK9",
};

export function FlagImportDialog({
  getPlayerNames,
  onImportFlags,
}: FlagImportDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [playerData, setPlayerData] = React.useState<PlayerFlagData[]>([]);
  const [isLoadingDracoviz, setIsLoadingDracoviz] = React.useState(false);
  const [dracovizError, setDracovizError] = React.useState<string | null>(
    null
  );

  // RK9 state
  const [rk9Url, setRk9Url] = React.useState("");
  const [isLoadingRk9, setIsLoadingRk9] = React.useState(false);
  const [rk9Error, setRk9Error] = React.useState<string | null>(null);
  const [rk9Fetched, setRk9Fetched] = React.useState(false);

  const fetchDracovizFlags = React.useCallback(async () => {
    const currentPlayerNames = getPlayerNames();
    const entries = Object.entries(currentPlayerNames).filter(
      ([, name]) => name?.trim()
    );

    if (entries.length === 0) {
      setPlayerData([]);
      return;
    }

    // Initialize player data with known flags
    const initialData: PlayerFlagData[] = entries.map(([playerId, name]) => {
      const known = getFlagsForPlayer(name);
      const resolved = known
        ? { flags: known, source: "known" as FlagSource }
        : { flags: [], source: null };
      return {
        playerId,
        playerName: name,
        selectedFlags: resolved.flags,
        selectedSource: resolved.source,
        knownFlags: known || null,
        dracovizFlags: null,
        rk9Flags: null,
      };
    });

    setPlayerData(initialData);

    // Fetch from dracoviz for non-known players
    const namesToFetch = entries
      .filter(([, name]) => !getFlagsForPlayer(name))
      .map(([, name]) => name);

    if (namesToFetch.length === 0) {
      return;
    }

    setIsLoadingDracoviz(true);
    setDracovizError(null);

    try {
      const response = await fetch("/api/dracoviz-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players: namesToFetch }),
      });

      const result = await response.json();

      if (!result.success) {
        setDracovizError(result.error || "Failed to fetch from Dracoviz");
        return;
      }

      // Build lookup: lowercase name → countries
      const dracovizLookup = new Map<string, string[]>();
      for (const p of result.players) {
        if (p.countries && p.countries.length > 0) {
          dracovizLookup.set(
            p.name.toLowerCase(),
            p.countries.map(normalizeCountryCode)
          );
        }
      }

      setPlayerData((prev) =>
        prev.map((pd) => {
          if (pd.knownFlags) return pd;

          const countries = dracovizLookup.get(
            pd.playerName.trim().toLowerCase()
          );
          if (!countries) return pd;

          return {
            ...pd,
            dracovizFlags: countries,
            selectedFlags: countries,
            selectedSource: "dracoviz",
          };
        })
      );
    } catch {
      setDracovizError("Failed to connect to Dracoviz");
    } finally {
      setIsLoadingDracoviz(false);
    }
  }, [getPlayerNames]);

  const handleOpen = React.useCallback(() => {
    setOpen(true);
    fetchDracovizFlags();
  }, [fetchDracovizFlags]);

  const handleFetchRk9 = async () => {
    if (!rk9Url.trim()) {
      setRk9Error("Please enter a URL");
      return;
    }

    setIsLoadingRk9(true);
    setRk9Error(null);

    try {
      const response = await fetch("/api/rk9-roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: rk9Url.trim() }),
      });

      const result = await response.json();

      if (!result.success) {
        setRk9Error(result.error || "Failed to fetch roster data");
        return;
      }

      const rosterPlayers: RosterPlayer[] = result.players;
      setRk9Fetched(true);

      // Match RK9 players to form players and update state
      setPlayerData((prev) =>
        prev.map((pd) => {
          const normalizedFormName = pd.playerName.trim().toLowerCase();

          const rosterPlayer = rosterPlayers.find(
            (rp) =>
              rp.screenName.toLowerCase() === normalizedFormName ||
              `${rp.firstName} ${rp.lastName}`.toLowerCase() ===
                normalizedFormName ||
              rp.firstName.toLowerCase() === normalizedFormName ||
              rp.lastName.toLowerCase() === normalizedFormName
          );

          if (!rosterPlayer || !rosterPlayer.country) return pd;

          const rk9Flags = [normalizeCountryCode(rosterPlayer.country)];

          // If player has no data yet, auto-select RK9
          const shouldAutoSelect = pd.selectedSource === null;

          return {
            ...pd,
            rk9Flags,
            selectedFlags: shouldAutoSelect ? rk9Flags : pd.selectedFlags,
            selectedSource: shouldAutoSelect ? "rk9" : pd.selectedSource,
          };
        })
      );
    } catch {
      setRk9Error("Failed to connect to server");
    } finally {
      setIsLoadingRk9(false);
    }
  };

  const handleSwap = (playerId: string) => {
    setPlayerData((prev) =>
      prev.map((pd) => {
        if (pd.playerId !== playerId) return pd;

        const next = getNextSource(pd.selectedSource, pd);
        if (!next) return pd;

        return {
          ...pd,
          selectedFlags: next.flags,
          selectedSource: next.source,
        };
      })
    );
  };

  const handleImport = () => {
    const updates = playerData
      .filter((pd) => pd.selectedSource !== null && pd.selectedFlags.length > 0)
      .map((pd) => ({
        playerId: pd.playerId,
        flags: pd.selectedFlags,
      }));

    if (updates.length > 0) {
      onImportFlags(updates);
    }
    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    setPlayerData([]);
    setDracovizError(null);
    setRk9Url("");
    setRk9Error(null);
    setRk9Fetched(false);
    setIsLoadingDracoviz(false);
    setIsLoadingRk9(false);
  };

  const importableCount = playerData.filter(
    (pd) => pd.selectedSource !== null && pd.selectedFlags.length > 0
  ).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
        else handleOpen();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
        >
          <Flag className="h-3 w-3 mr-1" />
          Import Flags
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Flags</DialogTitle>
          <DialogDescription>
            Automatically fetches flags from Dracoviz. Optionally provide an RK9
            roster URL for additional data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dracoviz loading/error state */}
          {isLoadingDracoviz && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Fetching flags from Dracoviz...
            </div>
          )}

          {dracovizError && (
            <div className="flex items-start gap-2 p-3 text-sm bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-md">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p>{dracovizError}</p>
                <p className="text-xs mt-1 opacity-75">
                  You can still import flags using an RK9 roster URL below.
                </p>
              </div>
            </div>
          )}

          {/* Player preview table */}
          {!isLoadingDracoviz && playerData.length > 0 && (
            <div className="p-3 text-sm bg-muted rounded-md space-y-2 max-h-64 overflow-y-auto">
              <ul className="space-y-1.5">
                {playerData.map((pd) => (
                  <li
                    key={pd.playerId}
                    className="flex items-center gap-2"
                  >
                    <span className="font-medium min-w-0 truncate max-w-[120px]">
                      {pd.playerName}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    {pd.selectedFlags.length > 0 ? (
                      <span className="flex items-center gap-1.5">
                        {pd.selectedFlags.map((code) => (
                          <span
                            key={code}
                            className="flex items-center gap-1"
                            title={getCountryName(code)}
                          >
                            <CircleFlag
                              countryCode={code.toLowerCase()}
                              height={14}
                              width={14}
                            />
                            <span className="text-xs">{code}</span>
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No data
                      </span>
                    )}
                    {pd.selectedSource && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${SOURCE_STYLES[pd.selectedSource]}`}
                      >
                        {SOURCE_LABELS[pd.selectedSource]}
                      </span>
                    )}
                    {canSwap(pd) && (
                      <button
                        type="button"
                        onClick={() => handleSwap(pd.playerId)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Switch source"
                      >
                        <ArrowLeftRight className="h-3 w-3" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isLoadingDracoviz && playerData.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground bg-muted rounded-md">
              No player names found in the form. Fill in player names first.
            </div>
          )}

          {/* Optional RK9 section */}
          <div className="space-y-2 border-t pt-3">
            <Label htmlFor="rk9-roster-url" className="text-xs font-medium">
              Optional: RK9 Roster URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="rk9-roster-url"
                type="url"
                value={rk9Url}
                onChange={(e) => setRk9Url(e.target.value)}
                placeholder="https://rk9.gg/roster/..."
                disabled={isLoadingRk9}
                className="text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFetchRk9}
                disabled={!rk9Url.trim() || isLoadingRk9}
                className="text-xs shrink-0"
              >
                {isLoadingRk9 ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : rk9Fetched ? (
                  "Refetch"
                ) : (
                  "Fetch RK9"
                )}
              </Button>
            </div>
            {rk9Error && (
              <div className="p-2 text-xs bg-destructive/10 text-destructive rounded-md">
                {rk9Error}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={importableCount === 0}
          >
            Import {importableCount} Flag{importableCount !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
