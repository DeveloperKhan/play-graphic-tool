"use client";

import { useRef, forwardRef, useImperativeHandle } from "react";
import { TournamentCanvas64, TournamentCanvas64Ref } from "./tournament-canvas-64";
import type { GraphicData } from "@/lib/graphic-data";

interface TournamentGraphic32Props {
  data: GraphicData;
}

export interface TournamentGraphic32Ref {
  getCanvasElement: () => HTMLDivElement | null;
}

export const TournamentGraphic32 = forwardRef<TournamentGraphic32Ref, TournamentGraphic32Props>(
  function TournamentGraphic32({ data }, ref) {
    const canvasRef = useRef<TournamentCanvas64Ref>(null);

    useImperativeHandle(ref, () => ({
      getCanvasElement: () => canvasRef.current?.getCanvasElement() ?? null,
    }));

    return (
      <TournamentCanvas64
        ref={canvasRef}
        data={data}
        bracketType={null}
      />
    );
  }
);
