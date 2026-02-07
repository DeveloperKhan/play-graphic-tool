"use client";

import { PlayerCard } from "./player-card";
import type { GraphicPlayer } from "@/lib/graphic-data";

interface PlayerColumnProps {
  title: string;
  players: GraphicPlayer[];
  compact?: boolean;
}

export function PlayerColumn({ title, players, compact = false }: PlayerColumnProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Column header */}
      <p className="text-white/70 text-xs uppercase tracking-wider">
        {title}
      </p>

      {/* Player cards */}
      <div className={`flex flex-col ${compact ? "gap-2" : "gap-3"}`}>
        {players.map((player) => (
          <PlayerCard
            key={`${player.bracketSide}-${player.group}`}
            player={player}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}
