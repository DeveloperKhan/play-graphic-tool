"use client";

import * as React from "react";
import { Form } from "@/components/ui/form";
import { EventInfoSection } from "./event-info-section";
import { PlayerInputSection } from "./player-input-section";
import { FormNavigation } from "./form-navigation";
import { useTournamentForm } from "@/hooks/use-tournament-form";
import { sortTeam } from "@/lib/pokemon-sort";
import type { TournamentData, Pokemon } from "@/lib/types";

interface TournamentFormProps {
  playerCount?: number;
  onFormChange?: (data: TournamentData) => void;
}

export function TournamentForm({
  playerCount = 16,
  onFormChange,
}: TournamentFormProps) {
  const form = useTournamentForm(playerCount);
  const playerOrder = form.watch("playerOrder");
  const currentPlayerCount = form.watch("playerCount");
  const overviewType = form.watch("overviewType");
  const players = form.watch("players");

  // Track which sections are open (all collapsed by default)
  const [openSections, setOpenSections] = React.useState<Set<string>>(() => new Set());
  const [activeSection, setActiveSection] = React.useState<string | null>(null);
  const [isSortingAllPokemon, setIsSortingAllPokemon] = React.useState(false);

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

  // Notify parent of form changes
  React.useEffect(() => {
    if (onFormChange) {
      const subscription = form.watch((data) => {
        onFormChange(data as TournamentData);
      });
      return () => subscription.unsubscribe();
    }
  }, [form, onFormChange]);

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
          else defaultPlacement = "25-32";

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
          isSortingPokemon={isSortingAllPokemon}
        />

        {/* Event Info */}
        <div id="event-info">
          <EventInfoSection form={form} />
        </div>

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
