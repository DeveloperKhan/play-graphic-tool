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
  const overviewType = form.watch("overviewType");
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
          const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"];
          const overviewType = parsedData.overviewType || "Usage";

          if (savedPlayerCount > actualPlayerCount) {
            // Add missing players
            for (let i = actualPlayerCount; i < savedPlayerCount; i++) {
              const playerId = `player-${i + 1}`;
              parsedData.playerOrder.push(playerId);

              // Determine default placement based on index (check from lowest to highest)
              let defaultPlacement: any = "33-64";
              if (i === 0) defaultPlacement = 1;
              else if (i === 1) defaultPlacement = 2;
              else if (i === 2) defaultPlacement = 3;
              else if (i === 3) defaultPlacement = 4;
              else if (i < 8) defaultPlacement = "5-8";
              else if (i < 16) defaultPlacement = "9-16";
              else if (i < 24) defaultPlacement = "17-24";
              else if (i < 32) defaultPlacement = "25-32";
              // else stays "33-64"

              // Determine default group and bracket side
              // For Top 64: First 32 are Winners (2 per group A-P), next 32 are Losers
              let defaultBracketSide: string;
              let defaultGroup: string;

              if (savedPlayerCount === 64) {
                defaultBracketSide = i < 32 ? "Winners" : "Losers";
                const indexInBracket = i < 32 ? i : i - 32;
                defaultGroup = groups[Math.floor(indexInBracket / 2)];
              } else {
                defaultBracketSide = i < savedPlayerCount / 2 ? "Winners" : "Losers";
                const groupCount = Math.min(savedPlayerCount / 2, 8);
                defaultGroup = groups[i % groupCount];
              }

              const basePlayer = {
                id: playerId,
                name: "",
                team: Array(6).fill(null).map(() => ({ id: "", isShadow: false })),
                flags: [""],
              };

              if (overviewType === "Bracket") {
                parsedData.players[playerId] = { ...basePlayer, placement: defaultPlacement };
              } else {
                parsedData.players[playerId] = {
                  ...basePlayer,
                  bracketSide: defaultBracketSide,
                  group: defaultGroup,
                };
              }
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

    // Define sort order for placements
    const placementOrder: Record<string | number, number> = {
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      "5-8": 5,
      "9-16": 6,
      "17-24": 7,
      "25-32": 8,
      "33-64": 9,
    };

    // Define sort order for groups
    const groupOrder: Record<string, number> = {
      A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
      I: 9, J: 10, K: 11, L: 12, M: 13, N: 14, O: 15, P: 16,
    };

    const sortedOrder = [...currentOrder].sort((a, b) => {
      const playerA = currentPlayers[a];
      const playerB = currentPlayers[b];

      if (overviewType === "Bracket") {
        // Sort by placement
        const placementA = placementOrder[playerA?.placement ?? "25-32"] ?? 99;
        const placementB = placementOrder[playerB?.placement ?? "25-32"] ?? 99;
        return placementA - placementB;
      } else {
        // Sort by bracket side (Winners first), then by group
        const sideA = playerA?.bracketSide === "Winners" ? 0 : 1;
        const sideB = playerB?.bracketSide === "Winners" ? 0 : 1;
        if (sideA !== sideB) return sideA - sideB;

        const groupA = groupOrder[playerA?.group ?? "P"] ?? 99;
        const groupB = groupOrder[playerB?.group ?? "P"] ?? 99;
        return groupA - groupB;
      }
    });

    form.setValue("playerOrder", sortedOrder);
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

    const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"];

    // Helper to create a fresh player with correct group/bracket assignment
    const createPlayer = (index: number, totalPlayers: number) => {
      const playerId = `player-${index + 1}`;

      // Determine placement based on index
      let defaultPlacement: any = "33-64";
      if (index === 0) defaultPlacement = 1;
      else if (index === 1) defaultPlacement = 2;
      else if (index === 2) defaultPlacement = 3;
      else if (index === 3) defaultPlacement = 4;
      else if (index < 8) defaultPlacement = "5-8";
      else if (index < 16) defaultPlacement = "9-16";
      else if (index < 24) defaultPlacement = "17-24";
      else if (index < 32) defaultPlacement = "25-32";
      // else stays "33-64"

      // For Top 64: 32 Winners (2 per group A-P), then 32 Losers (2 per group A-P)
      // For other counts: half Winners, half Losers, distributed across groups
      let bracketSide: "Winners" | "Losers";
      let group: string;

      if (totalPlayers === 64) {
        // Top 64: First 32 are Winners, next 32 are Losers
        // Within each bracket: 2 players per group (A, A, B, B, ... P, P)
        bracketSide = index < 32 ? "Winners" : "Losers";
        const indexInBracket = index < 32 ? index : index - 32;
        group = groups[Math.floor(indexInBracket / 2)];
      } else {
        // Other counts: first half Winners, second half Losers
        bracketSide = index < totalPlayers / 2 ? "Winners" : "Losers";
        const groupCount = Math.min(totalPlayers / 2, 8); // Max 8 groups for Top 16 and below
        group = groups[index % groupCount];
      }

      const basePlayer = {
        id: playerId,
        name: "",
        team: Array(6).fill(null).map(() => ({ id: "", isShadow: false })),
        flags: [""],
      };

      if (overviewType === "Bracket") {
        return { ...basePlayer, placement: defaultPlacement };
      } else {
        return {
          ...basePlayer,
          bracketSide: bracketSide as any,
          group: group as any,
        };
      }
    };

    // When switching TO 64 players, reset all players with fresh structure
    if (currentPlayerCount === 64) {
      const newPlayers: Record<string, any> = {};
      const newOrder: string[] = [];

      for (let i = 0; i < 64; i++) {
        const playerId = `player-${i + 1}`;
        newOrder.push(playerId);
        newPlayers[playerId] = createPlayer(i, 64);
      }

      form.setValue("players", newPlayers);
      form.setValue("playerOrder", newOrder);

      // Add Top 64 column wrappers (5 columns per side)
      const defaultWrapper = { mode: "lines" as const, text: "" };
      form.setValue("columnWrappers", {
        winners1: defaultWrapper,
        winners2: defaultWrapper,
        winners3: defaultWrapper,
        winners4: defaultWrapper,
        winners5: defaultWrapper,
        losers1: defaultWrapper,
        losers2: defaultWrapper,
        losers3: defaultWrapper,
        losers4: defaultWrapper,
        losers5: defaultWrapper,
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
        newPlayers[playerId] = createPlayer(i, currentPlayerCount);
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
  }, [currentPlayerCount, form, overviewType, hasLoadedFromStorage]);

  // Handle overview type changes - update player fields accordingly
  React.useEffect(() => {
    const players = form.getValues("players");
    const updatedPlayers = { ...players };
    let needsUpdate = false;

    Object.keys(updatedPlayers).forEach((playerId, index) => {
      const player = updatedPlayers[playerId];

      if (overviewType === "Bracket") {
        // Switch to Bracket mode - add placement, remove bracketSide/group
        if (player.placement === undefined) {
          needsUpdate = true;
          // Determine default placement based on index
          let defaultPlacement: any = "9-16";
          if (index === 0) defaultPlacement = 1;
          else if (index === 1) defaultPlacement = 2;
          else if (index === 2) defaultPlacement = 3;
          else if (index === 3) defaultPlacement = 4;
          else if (index < 8) defaultPlacement = "5-8";
          else if (index < 16) defaultPlacement = "9-16";
          else if (index < 24) defaultPlacement = "17-24";
          else if (index < 32) defaultPlacement = "25-32";
          else defaultPlacement = "33-64";

          updatedPlayers[playerId] = {
            ...player,
            placement: defaultPlacement,
          };
          // Remove Usage mode fields
          delete (updatedPlayers[playerId] as any).bracketSide;
          delete (updatedPlayers[playerId] as any).group;
        }
      } else if (overviewType === "Usage") {
        // Switch to Usage mode - add bracketSide/group, remove placement
        if (player.bracketSide === undefined || player.group === undefined) {
          needsUpdate = true;
          const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"];
          const groupCount = currentPlayerCount / 2;

          updatedPlayers[playerId] = {
            ...player,
            bracketSide: (index < currentPlayerCount / 2 ? "Winners" : "Losers") as any,
            group: groups[index % groupCount] as any,
          };
          // Remove Bracket mode field
          delete (updatedPlayers[playerId] as any).placement;
        }
      }
    });

    if (needsUpdate) {
      form.setValue("players", updatedPlayers);
    }
  }, [overviewType, form, currentPlayerCount]);

  return (
    <Form {...form}>
      <form className="space-y-6 min-w-0">
        {/* Sticky Navigation */}
        <FormNavigation
          playerOrder={playerOrder}
          playerNames={playerNames}
          activeSection={activeSection}
          onNavigate={handleNavigate}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          onSortPlayers={handleSortPlayers}
          onSortAllPokemon={handleSortAllPokemon}
          onImport={handleImport}
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
              isOpen={openSections.has(playerId)}
              onOpenChange={(open) => handleOpenChange(playerId, open)}
            />
          ))}
        </div>
      </form>
    </Form>
  );
}
