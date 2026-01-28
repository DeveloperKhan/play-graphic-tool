"use client";

import * as React from "react";
import { Form } from "@/components/ui/form";
import { EventInfoSection } from "./event-info-section";
import { PlayerInputSection } from "./player-input-section";
import { useTournamentForm } from "@/hooks/use-tournament-form";
import type { TournamentData } from "@/lib/types";

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
        {/* Event Info */}
        <EventInfoSection form={form} />

        {/* All Players - Simple List */}
        <div className="space-y-4 min-w-0">
          {playerOrder.map((playerId, index) => (
            <PlayerInputSection
              key={playerId}
              form={form}
              playerId={playerId}
              playerNumber={index + 1}
            />
          ))}
        </div>
      </form>
    </Form>
  );
}
