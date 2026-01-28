"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormNavigationProps {
  playerOrder: string[];
  playerNames: Record<string, string>;
  activeSection: string | null;
  onNavigate: (sectionId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export function FormNavigation({
  playerOrder,
  playerNames,
  activeSection,
  onNavigate,
  onExpandAll,
  onCollapseAll,
}: FormNavigationProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4 mb-4 pt-1">
      {/* Expand/Collapse buttons */}
      <div className="flex gap-2 mb-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExpandAll}
          className="text-xs"
        >
          <ChevronDown className="h-3 w-3 mr-1" />
          Expand All
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCollapseAll}
          className="text-xs"
        >
          <ChevronUp className="h-3 w-3 mr-1" />
          Collapse All
        </Button>
      </div>

      {/* Navigation chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 -mb-1">
        <button
          type="button"
          onClick={() => onNavigate("event-info")}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            activeSection === "event-info"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          Event
        </button>
        {playerOrder.map((playerId, index) => {
          const playerNum = index + 1;
          const playerName = playerNames[playerId];
          const label = playerName ? `P${playerNum}` : `P${playerNum}`;
          const title = playerName || `Player ${playerNum}`;

          return (
            <button
              key={playerId}
              type="button"
              onClick={() => onNavigate(playerId)}
              title={title}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                activeSection === playerId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
