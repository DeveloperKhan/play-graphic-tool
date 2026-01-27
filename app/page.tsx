"use client";

import { useState } from "react";
import { TournamentForm } from "@/components/form/tournament-form";
import type { TournamentData } from "@/lib/types";

export default function Home() {
  const [tournamentData, setTournamentData] = useState<TournamentData | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Play! Pokemon GO Tournament Graphic Generator
          </h1>
          <p className="text-muted-foreground mt-2">
            Create professional tournament graphics for your Pokemon GO events
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Tournament Details</h2>
            <TournamentForm
              playerCount={16}
              onFormChange={(data) => setTournamentData(data)}
            />
          </div>

          {/* Preview Section (placeholder for now) */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Preview</h2>
            <div className="border rounded-lg p-8 bg-muted/50 min-h-150 flex items-center justify-center">
              <p className="text-muted-foreground">
                Graphic preview will appear here
              </p>
            </div>
            {tournamentData && (
              <div className="text-xs text-muted-foreground">
                <p>Event: {tournamentData.eventName || "Not set"}</p>
                <p>Type: {tournamentData.eventType}</p>
                <p>Overview: {tournamentData.overviewType}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
