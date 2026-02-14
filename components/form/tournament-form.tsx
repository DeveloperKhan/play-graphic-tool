"use client";

import * as React from "react";
import { Form } from "@/components/ui/form";
import { EventInfoSection } from "./event-info-section";
import { PlayerInputSection } from "./player-input-section";
import { FormNavigation } from "./form-navigation";
import { ColumnWrapperSection, BracketLabelsSection } from "./column-wrapper-section";
import { useTournamentForm, createDefaultTournamentData } from "@/hooks/use-tournament-form";
import { sortTeam } from "@/lib/pokemon-sort";
import type { TournamentData, Pokemon } from "@/lib/types";

const STORAGE_KEY = "tournament-form-data";

interface TournamentFormProps {
  onFormChange?: (data: TournamentData) => void;
}

export function TournamentForm({
  onFormChange,
}: TournamentFormProps) {
  const form = useTournamentForm();
  const playerOrder = form.watch("playerOrder");
  const currentPlayerCount = form.watch("playerCount");
  const players = form.watch("players");

  // Track which sections are open (all collapsed by default)
  const [openSections, setOpenSections] = React.useState<Set<string>>(() => new Set());
  const [activeSection, setActiveSection] = React.useState<string | null>(null);
  const [isSortingAllPokemon, setIsSortingAllPokemon] = React.useState(false);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = React.useState(false);

  // Ref to track previous player count for detecting changes (declared early for localStorage access)
  const prevPlayerCountRef = React.useRef<number | null>(null);

  // Load saved form data from localStorage on mount
  React.useEffect(() => {
    if (hasLoadedFromStorage) return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedData = JSON.parse(saved);

        // Migrate old eventName to titleLines if needed
        if (!parsedData.titleLines && parsedData.eventName !== undefined) {
          parsedData.titleLines = [parsedData.eventName, "", ""];
          delete parsedData.eventName;
        }
        // Ensure titleLines exists
        if (!parsedData.titleLines) {
          parsedData.titleLines = ["", "", ""];
        }

        // Ensure eventDateRange exists with empty defaults
        if (!parsedData.eventDateRange) {
          parsedData.eventDateRange = { startDate: "", endDate: "" };
        }

        // Ensure playerCount is a valid number (coerce from string if needed)
        const validPlayerCounts = [4, 8, 16, 32, 64];
        let savedPlayerCount = Number(parsedData.playerCount) || 16;
        if (!validPlayerCounts.includes(savedPlayerCount)) {
          savedPlayerCount = 16; // Fall back to 16 if invalid
        }
        parsedData.playerCount = savedPlayerCount;

        const actualPlayerCount = Object.keys(parsedData.players || {}).length;

        // Fix player count mismatch (can happen when playerCount changed but effect didn't complete)
        if (savedPlayerCount !== actualPlayerCount && parsedData.players && parsedData.playerOrder) {
          if (savedPlayerCount > actualPlayerCount) {
            // Add missing players
            for (let i = actualPlayerCount; i < savedPlayerCount; i++) {
              const playerId = `player-${i + 1}`;
              parsedData.playerOrder.push(playerId);
              parsedData.players[playerId] = {
                id: playerId,
                name: "",
                team: Array(6).fill(null).map(() => ({ id: "", isShadow: false })),
                flags: [""],
              };
            }
          } else {
            // Remove excess players
            const excessPlayerIds = parsedData.playerOrder.slice(savedPlayerCount);
            parsedData.playerOrder = parsedData.playerOrder.slice(0, savedPlayerCount);
            excessPlayerIds.forEach((playerId: string) => {
              delete parsedData.players[playerId];
            });
          }
        }

        // Migrate old player data - remove deprecated fields
        if (parsedData.players) {
          Object.keys(parsedData.players).forEach((playerId) => {
            const player = parsedData.players[playerId];
            delete player.placement;
            delete player.bracketSide;
            delete player.group;
          });
        }

        // Ensure column wrappers exist for Top 64
        if (savedPlayerCount === 64) {
          if (!parsedData.columnWrappers) {
            parsedData.columnWrappers = {};
          }
          // Add missing Top 64 column wrappers (5 columns per side)
          const defaultWrapper = { mode: "lines", text: "" };
          if (!parsedData.columnWrappers.winners1) parsedData.columnWrappers.winners1 = defaultWrapper;
          if (!parsedData.columnWrappers.winners2) parsedData.columnWrappers.winners2 = defaultWrapper;
          if (!parsedData.columnWrappers.winners3) parsedData.columnWrappers.winners3 = defaultWrapper;
          if (!parsedData.columnWrappers.winners4) parsedData.columnWrappers.winners4 = defaultWrapper;
          if (!parsedData.columnWrappers.winners5) parsedData.columnWrappers.winners5 = defaultWrapper;
          if (!parsedData.columnWrappers.losers1) parsedData.columnWrappers.losers1 = defaultWrapper;
          if (!parsedData.columnWrappers.losers2) parsedData.columnWrappers.losers2 = defaultWrapper;
          if (!parsedData.columnWrappers.losers3) parsedData.columnWrappers.losers3 = defaultWrapper;
          if (!parsedData.columnWrappers.losers4) parsedData.columnWrappers.losers4 = defaultWrapper;
          if (!parsedData.columnWrappers.losers5) parsedData.columnWrappers.losers5 = defaultWrapper;
        }

        // Update the player count ref BEFORE reset to prevent the player count change effect from resetting players
        if (parsedData.playerCount) {
          prevPlayerCountRef.current = parsedData.playerCount;
        }
        form.reset(parsedData as TournamentData);
        // Clear any validation errors that might have been triggered
        form.clearErrors();
        // Explicitly notify parent to update graphic immediately
        onFormChange?.(parsedData as TournamentData);
      }
    } catch (error) {
      console.error("Failed to load saved form data:", error);
    }
    setHasLoadedFromStorage(true);
  }, [form, hasLoadedFromStorage, onFormChange]);

  // Save form data to localStorage whenever it changes
  React.useEffect(() => {
    if (!hasLoadedFromStorage) return;

    const subscription = form.watch((data) => {
      try {
        // Only save when player count is consistent to avoid race conditions
        const actualPlayerCount = data.players ? Object.keys(data.players).length : 0;
        if (data.playerCount === actualPlayerCount) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
      } catch (error) {
        console.error("Failed to save form data:", error);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, hasLoadedFromStorage]);

  // Get player names for navigation display
  const playerNames = React.useMemo(() => {
    const names: Record<string, string> = {};
    if (players) {
      Object.entries(players).forEach(([id, player]) => {
        names[id] = player?.name?.trim() || "";
      });
    }
    return names;
  }, [players]);

  // Callback to get fresh player names (avoids stale React Hook Form watch data)
  const getPlayerNames = React.useCallback(() => {
    const names: Record<string, string> = {};
    const currentPlayers = form.getValues("players");
    if (currentPlayers) {
      Object.entries(currentPlayers).forEach(([id, player]) => {
        names[id] = (player as { name?: string })?.name?.trim() || "";
      });
    }
    return names;
  }, [form]);

  const handleOpenChange = (sectionId: string, open: boolean) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (open) {
        next.add(sectionId);
      } else {
        next.delete(sectionId);
      }
      return next;
    });
  };

  const handleNavigate = (sectionId: string) => {
    // Open the section if it's a player
    if (sectionId !== "event-info") {
      setOpenSections((prev) => new Set(prev).add(sectionId));
    }

    // Set active section for highlighting
    setActiveSection(sectionId);

    // Scroll to section within the form's scroll container
    // Use setTimeout to allow collapsible to open first
    setTimeout(() => {
      const elementId = sectionId === "event-info" ? "event-info" : `player-${sectionId}`;
      const element = document.getElementById(elementId);
      const scrollContainer = document.getElementById("form-scroll-container");

      if (element && scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const offset = elementRect.top - containerRect.top + scrollContainer.scrollTop;

        scrollContainer.scrollTo({
          top: offset - 80, // Account for sticky nav height
          behavior: "smooth",
        });
      }
    }, 50);
  };

  const handleExpandAll = () => {
    setOpenSections(new Set(playerOrder));
  };

  const handleCollapseAll = () => {
    setOpenSections(new Set());
  };

  const handleSortPlayers = () => {
    const currentPlayers = form.getValues("players");
    const currentOrder = form.getValues("playerOrder");

    // Sort players alphabetically by name
    const sortedOrder = [...currentOrder].sort((a, b) => {
      const playerA = currentPlayers[a];
      const playerB = currentPlayers[b];
      const nameA = playerA?.name?.toLowerCase() || "";
      const nameB = playerB?.name?.toLowerCase() || "";
      return nameA.localeCompare(nameB);
    });

    form.setValue("playerOrder", sortedOrder);
  };

  // Move player up in order
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const currentOrder = form.getValues("playerOrder");
    const newOrder = [...currentOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    form.setValue("playerOrder", newOrder);
  };

  // Move player down in order
  const handleMoveDown = (index: number) => {
    const currentOrder = form.getValues("playerOrder");
    if (index >= currentOrder.length - 1) return;
    const newOrder = [...currentOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    form.setValue("playerOrder", newOrder);
  };

  // Move player to a specific position (1-indexed)
  const handleMoveTo = (fromIndex: number, toPosition: number) => {
    const currentOrder = form.getValues("playerOrder");
    const toIndex = toPosition - 1; // Convert to 0-indexed
    if (fromIndex === toIndex) return;
    if (toIndex < 0 || toIndex >= currentOrder.length) return;

    const newOrder = [...currentOrder];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    form.setValue("playerOrder", newOrder);
  };

  const handleSortAllPokemon = async () => {
    const currentOrder = form.getValues("playerOrder");

    setIsSortingAllPokemon(true);
    try {
      // Sort each player's team sequentially to avoid race conditions
      for (const playerId of currentOrder) {
        // Get fresh team data for each player
        const team = form.getValues(`players.${playerId}.team`) as Pokemon[];
        if (!team) continue;

        const sortedTeam = await sortTeam(team);
        // Update each Pokemon slot for this player
        for (let index = 0; index < sortedTeam.length; index++) {
          const pokemon = sortedTeam[index];
          form.setValue(`players.${playerId}.team.${index}.id`, pokemon.id);
          form.setValue(`players.${playerId}.team.${index}.isShadow`, pokemon.isShadow);
        }
      }
    } finally {
      setIsSortingAllPokemon(false);
    }
  };

  const handleImport = (importedPlayers: Array<{
    name: string;
    flags: string[];
    team: Array<{ id: string; isShadow: boolean }>;
  }>) => {
    const currentOrder = form.getValues("playerOrder");

    // Update players up to the number of imported players or available slots
    const maxPlayers = Math.min(importedPlayers.length, currentOrder.length);

    for (let i = 0; i < maxPlayers; i++) {
      const playerId = currentOrder[i];
      const imported = importedPlayers[i];

      // Update player name
      form.setValue(`players.${playerId}.name`, imported.name);

      // Update player flags
      form.setValue(`players.${playerId}.flags`, imported.flags);

      // Update player team
      for (let j = 0; j < 6; j++) {
        const pokemon = imported.team[j] || { id: "", isShadow: false };
        form.setValue(`players.${playerId}.team.${j}.id`, pokemon.id);
        form.setValue(`players.${playerId}.team.${j}.isShadow`, pokemon.isShadow);
      }
    }
  };

  const handleImportFlags = (updates: Array<{ playerId: string; flags: string[] }>) => {
    for (const update of updates) {
      form.setValue(`players.${update.playerId}.flags`, update.flags);
    }
  };

  const handleResetForm = () => {
    // Clear localStorage and reset form to defaults
    localStorage.removeItem(STORAGE_KEY);
    const defaultData = createDefaultTournamentData(currentPlayerCount);
    form.reset(defaultData);
  };

  const handleCopyJson = async () => {
    const data = form.getValues();
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      return false;
    }
  };

  const handleImportJson = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString) as TournamentData;
      form.reset(data);
      return true;
    } catch (error) {
      console.error("Failed to parse JSON:", error);
      return false;
    }
  };

  // Notify parent of form changes
  React.useEffect(() => {
    if (onFormChange) {
      const subscription = form.watch((data) => {
        onFormChange(data as TournamentData);
      });
      return () => subscription.unsubscribe();
    }
  }, [form, onFormChange]);

  // Handle player count changes - add or remove players as needed
  React.useEffect(() => {
    // Skip until localStorage has been loaded to prevent race conditions
    if (!hasLoadedFromStorage) {
      return;
    }

    // Skip if this is the initial render or if player count hasn't changed
    if (prevPlayerCountRef.current === null) {
      prevPlayerCountRef.current = currentPlayerCount;
      return;
    }
    if (prevPlayerCountRef.current === currentPlayerCount) {
      return;
    }

    const prevCount = prevPlayerCountRef.current;
    prevPlayerCountRef.current = currentPlayerCount;

    // Helper to create a fresh player
    const createPlayer = (index: number) => {
      const playerId = `player-${index + 1}`;
      return {
        id: playerId,
        name: "",
        team: Array(6).fill(null).map(() => ({ id: "", isShadow: false })),
        flags: [""],
      };
    };

    // When switching TO 64 players, reset all players with fresh structure
    if (currentPlayerCount === 64) {
      const newPlayers: Record<string, any> = {};
      const newOrder: string[] = [];

      for (let i = 0; i < 64; i++) {
        const playerId = `player-${i + 1}`;
        newOrder.push(playerId);
        newPlayers[playerId] = createPlayer(i);
      }

      form.setValue("players", newPlayers);
      form.setValue("playerOrder", newOrder);

      // Add Top 64 column wrappers (16 blocks: 8 per graphic, 4 players per block)
      const defaultWrapper = { mode: "lines" as const, text: "" };
      form.setValue("columnWrappers", {
        winners1: defaultWrapper,
        winners2: defaultWrapper,
        losers1: defaultWrapper,
        losers2: defaultWrapper,
        // Winners graphic columns
        winners1a: defaultWrapper,
        winners1b: defaultWrapper,
        winners2a: defaultWrapper,
        winners2b: defaultWrapper,
        winners3a: defaultWrapper,
        winners3b: defaultWrapper,
        winners4a: defaultWrapper,
        winners4b: defaultWrapper,
        // Losers graphic columns
        losers1a: defaultWrapper,
        losers1b: defaultWrapper,
        losers2a: defaultWrapper,
        losers2b: defaultWrapper,
        losers3a: defaultWrapper,
        losers3b: defaultWrapper,
        losers4a: defaultWrapper,
        losers4b: defaultWrapper,
      });
    } else if (currentPlayerCount > prevCount) {
      // Add new players (for non-64 counts)
      const currentPlayers = form.getValues("players");
      const currentOrder = form.getValues("playerOrder");
      const newPlayers = { ...currentPlayers };
      const newOrder = [...currentOrder];

      for (let i = prevCount; i < currentPlayerCount; i++) {
        const playerId = `player-${i + 1}`;
        newOrder.push(playerId);
        newPlayers[playerId] = createPlayer(i);
      }

      form.setValue("players", newPlayers);
      form.setValue("playerOrder", newOrder);
    } else if (currentPlayerCount < prevCount) {
      // Remove excess players
      const currentPlayers = form.getValues("players");
      const currentOrder = form.getValues("playerOrder");
      const newPlayers = { ...currentPlayers };
      const newOrder = currentOrder.slice(0, currentPlayerCount);

      // Remove players that are no longer in the order
      currentOrder.slice(currentPlayerCount).forEach((playerId) => {
        delete newPlayers[playerId];
      });

      form.setValue("players", newPlayers);
      form.setValue("playerOrder", newOrder);
    }
  }, [currentPlayerCount, form, hasLoadedFromStorage]);

  return (
    <Form {...form}>
      <form className="space-y-6 min-w-0">
        {/* Sticky Navigation */}
        <FormNavigation
          playerOrder={playerOrder}
          playerNames={playerNames}
          getPlayerNames={getPlayerNames}
          activeSection={activeSection}
          onNavigate={handleNavigate}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          onSortPlayers={handleSortPlayers}
          onSortAllPokemon={handleSortAllPokemon}
          onImport={handleImport}
          onImportFlags={handleImportFlags}
          onResetForm={handleResetForm}
          onCopyJson={handleCopyJson}
          onImportJson={handleImportJson}
          isSortingPokemon={isSortingAllPokemon}
        />

        {/* Event Info */}
        <div id="event-info">
          <EventInfoSection form={form} />
        </div>

        {/* Bracket Labels */}
        <BracketLabelsSection form={form} />

        {/* Column Wrapper Settings */}
        <ColumnWrapperSection form={form} />

        {/* All Players - Collapsible List */}
        <div className="space-y-4 min-w-0">
          {playerOrder.map((playerId, index) => (
            <PlayerInputSection
              key={playerId}
              form={form}
              playerId={playerId}
              playerNumber={index + 1}
              totalPlayers={playerOrder.length}
              isOpen={openSections.has(playerId)}
              onOpenChange={(open) => handleOpenChange(playerId, open)}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
              onMoveTo={(position) => handleMoveTo(index, position)}
              isFirst={index === 0}
              isLast={index === playerOrder.length - 1}
            />
          ))}
        </div>
      </form>
    </Form>
  );
}
