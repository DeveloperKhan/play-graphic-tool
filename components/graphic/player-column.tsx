"use client";

import { PlayerCard } from "./player-card";
import type { GraphicPlayer } from "@/lib/graphic-data";

interface PlayerColumnProps {
  title: string;
  players: GraphicPlayer[];
}

export function PlayerColumn({ title, players }: PlayerColumnProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Column header */}
      <p
        style={{
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: 24,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </p>

      {/* Player cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {players.map((player) => (
          <PlayerCard
            key={`${player.bracketSide}-${player.group}`}
            player={player}
          />
        ))}
      </div>
    </div>
  );
}
