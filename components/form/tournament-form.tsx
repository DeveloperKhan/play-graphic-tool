"use client";

import * as React from "react";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  // Notify parent of form changes
  React.useEffect(() => {
    if (onFormChange) {
      const subscription = form.watch((data) => {
        onFormChange(data as TournamentData);
      });
      return () => subscription.unsubscribe();
    }
  }, [form, onFormChange]);

  // Group players by placement for better organization
  const top4Players = playerOrder.slice(0, 4);
  const place5to8 = currentPlayerCount >= 8 ? playerOrder.slice(4, 8) : [];
  const place9to16 = currentPlayerCount >= 16 ? playerOrder.slice(8, 16) : [];
  const place17to24 = currentPlayerCount >= 24 ? playerOrder.slice(16, 24) : [];
  const place25to32 = currentPlayerCount === 32 ? playerOrder.slice(24, 32) : [];

  return (
    <Form {...form}>
      <form className="space-y-6">
        {/* Event Info */}
        <EventInfoSection form={form} />

        {/* Players organized by tabs */}
        <Tabs defaultValue="top4" className="w-full">
          <TabsList
            className={`grid w-full ${
              currentPlayerCount === 4
                ? "grid-cols-1"
                : currentPlayerCount === 8
                ? "grid-cols-2"
                : currentPlayerCount === 16
                ? "grid-cols-3"
                : "grid-cols-5"
            }`}
          >
            <TabsTrigger value="top4">Top 4</TabsTrigger>
            {currentPlayerCount >= 8 && (
              <TabsTrigger value="5-8">5-8 Place</TabsTrigger>
            )}
            {currentPlayerCount >= 16 && (
              <TabsTrigger value="9-16">9-16 Place</TabsTrigger>
            )}
            {currentPlayerCount >= 24 && (
              <TabsTrigger value="17-24">17-24 Place</TabsTrigger>
            )}
            {currentPlayerCount === 32 && (
              <TabsTrigger value="25-32">25-32 Place</TabsTrigger>
            )}
          </TabsList>

          {/* Top 4 */}
          <TabsContent value="top4" className="space-y-4">
            {top4Players.map((playerId, index) => (
              <PlayerInputSection
                key={playerId}
                form={form}
                playerId={playerId}
                playerNumber={index + 1}
              />
            ))}
          </TabsContent>

          {/* 5-8 Place */}
          {currentPlayerCount >= 8 && (
            <TabsContent value="5-8" className="space-y-4">
              {place5to8.map((playerId, index) => (
                <PlayerInputSection
                  key={playerId}
                  form={form}
                  playerId={playerId}
                  playerNumber={index + 5}
                />
              ))}
            </TabsContent>
          )}

          {/* 9-16 Place */}
          {currentPlayerCount >= 16 && (
            <TabsContent value="9-16" className="space-y-4">
              {place9to16.map((playerId, index) => (
                <PlayerInputSection
                  key={playerId}
                  form={form}
                  playerId={playerId}
                  playerNumber={index + 9}
                />
              ))}
            </TabsContent>
          )}

          {/* 17-24 Place */}
          {currentPlayerCount >= 24 && (
            <TabsContent value="17-24" className="space-y-4">
              {place17to24.map((playerId, index) => (
                <PlayerInputSection
                  key={playerId}
                  form={form}
                  playerId={playerId}
                  playerNumber={index + 17}
                />
              ))}
            </TabsContent>
          )}

          {/* 25-32 Place */}
          {currentPlayerCount === 32 && (
            <TabsContent value="25-32" className="space-y-4">
              {place25to32.map((playerId, index) => (
                <PlayerInputSection
                  key={playerId}
                  form={form}
                  playerId={playerId}
                  playerNumber={index + 25}
                />
              ))}
            </TabsContent>
          )}
        </Tabs>
      </form>
    </Form>
  );
}
