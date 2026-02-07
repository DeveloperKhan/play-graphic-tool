"use client";

import { GraphicHeader } from "./graphic-header";
import { UsageSection } from "./usage-section";
import { PlayerColumn } from "./player-column";
import { GraphicFooter } from "./graphic-footer";
import type { GraphicData } from "@/lib/graphic-data";
import { getPlayersByColumn } from "@/lib/las-vegas-data";

interface TournamentGraphicProps {
  data: GraphicData;
  scale?: number;
}

export function TournamentGraphic({ data, scale = 1 }: TournamentGraphicProps) {
  const { winnersCol1, winnersCol2, losers } = getPlayersByColumn(data);

  // The graphic is designed for 2100x2100, but we render at a smaller scale for preview
  const baseWidth = 2100;
  const baseHeight = 2100;

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: baseWidth * scale,
        height: baseHeight * scale,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/assets/graphic/background.png')",
          width: baseWidth,
          height: baseHeight,
        }}
      />

      {/* Content container */}
      <div
        className="relative flex flex-col"
        style={{
          width: baseWidth,
          height: baseHeight,
        }}
      >
        {/* Top section: Header + Usage + Losers bracket preview */}
        <div className="flex">
          {/* Left: Header and Usage */}
          <div className="flex-1">
            <GraphicHeader
              eventName={data.eventName}
              eventYear={data.eventYear}
              eventType={data.eventType}
            />
            <UsageSection
              usageStats={data.usageStats}
              totalPlayers={data.players.length}
            />
          </div>

          {/* Right: Losers bracket column (first 4) */}
          <div className="w-[500px] pt-4 pr-4">
            <PlayerColumn
              title="Losers Bracket"
              players={losers.slice(0, 4)}
              compact
            />
          </div>
        </div>

        {/* Main section: 3 columns of players */}
        <div className="flex-1 grid grid-cols-3 gap-4 px-4 pt-6">
          {/* Winners Bracket - Column 1 (Groups A-D) */}
          <PlayerColumn
            title="Winners Bracket"
            players={winnersCol1}
          />

          {/* Winners Bracket - Column 2 (Groups E-H) */}
          <PlayerColumn
            title="Winners Bracket"
            players={winnersCol2}
          />

          {/* Losers Bracket - Column 3 (Groups A-H) */}
          <PlayerColumn
            title="Losers Bracket"
            players={losers.slice(4)}
            compact
          />
        </div>

        {/* Footer */}
        <div className="mt-auto">
          <GraphicFooter />
        </div>
      </div>
    </div>
  );
}
