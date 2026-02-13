"use client";

import { useRef, forwardRef, useImperativeHandle } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TournamentCanvas64, TournamentCanvas64Ref } from "./tournament-canvas-64";
import { splitGraphicDataFor64, type GraphicData } from "@/lib/graphic-data";

interface TournamentGraphic64Props {
  data: GraphicData;
}

export interface TournamentGraphic64Ref {
  getWinnersCanvasElement: () => HTMLDivElement | null;
  getLosersCanvasElement: () => HTMLDivElement | null;
  isMultiCanvas: boolean;
}

export const TournamentGraphic64 = forwardRef<TournamentGraphic64Ref, TournamentGraphic64Props>(
  function TournamentGraphic64({ data }, ref) {
    const winnersRef = useRef<TournamentCanvas64Ref>(null);
    const losersRef = useRef<TournamentCanvas64Ref>(null);

    // Split data for Winners and Losers graphics
    const { winnersData, losersData } = splitGraphicDataFor64(data);

    useImperativeHandle(ref, () => ({
      getWinnersCanvasElement: () => winnersRef.current?.getCanvasElement() ?? null,
      getLosersCanvasElement: () => losersRef.current?.getCanvasElement() ?? null,
      isMultiCanvas: true,
    }));

    return (
      <Tabs defaultValue="winners" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="winners">Winners Bracket</TabsTrigger>
          <TabsTrigger value="losers">Losers Bracket</TabsTrigger>
        </TabsList>
        <TabsContent value="winners" className="mt-0">
          <TournamentCanvas64
            ref={winnersRef}
            data={winnersData}
            bracketType="winners"
          />
        </TabsContent>
        <TabsContent value="losers" className="mt-0">
          <TournamentCanvas64
            ref={losersRef}
            data={losersData}
            bracketType="losers"
          />
        </TabsContent>
      </Tabs>
    );
  }
);
