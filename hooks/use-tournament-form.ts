import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tournamentSchema } from "@/lib/schema";
import { createDefaultTournamentData } from "@/lib/tournament-defaults";
import type { TournamentData } from "@/lib/types";

/**
 * Custom hook for tournament form state management
 */
export function useTournamentForm(playerCount: number = 16) {
  const form = useForm<TournamentData>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: createDefaultTournamentData(playerCount),
    mode: "onChange", // Live validation for better UX
  });

  return form;
}
