"use client";

import type { UsageStats } from "@/lib/types";
import { UsageItem } from "./usage-item";

interface UsageSectionProps {
  usageStats: UsageStats[];
  totalPlayers: number;
}

export function UsageSection({ usageStats, totalPlayers }: UsageSectionProps) {
  // Split into two rows of 6
  const topRow = usageStats.slice(0, 6);
  const bottomRow = usageStats.slice(6, 12);

  return (
    <div className="flex flex-col gap-2 px-4">
      {/* Section label */}
      <p className="text-white/80 text-xs uppercase tracking-wider mb-1">
        Top Cut Usage
      </p>

      {/* Top row - 6 Pokemon */}
      <div className="flex gap-2 justify-start">
        {topRow.map((stat) => (
          <UsageItem
            key={stat.pokemon}
            pokemonName={stat.pokemon}
            count={stat.count}
            shadowCount={stat.shadowCount}
            totalPlayers={totalPlayers}
          />
        ))}
      </div>

      {/* Bottom row - 6 Pokemon */}
      <div className="flex gap-2 justify-start">
        {bottomRow.map((stat) => (
          <UsageItem
            key={stat.pokemon}
            pokemonName={stat.pokemon}
            count={stat.count}
            shadowCount={stat.shadowCount}
            totalPlayers={totalPlayers}
          />
        ))}
      </div>
    </div>
  );
}
