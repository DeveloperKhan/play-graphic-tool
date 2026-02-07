"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getSpriteByName } from "@/lib/pokemon-sprites";

interface UsageItemProps {
  pokemonName: string;
  count: number;
  shadowCount: number;
  totalPlayers: number;
}

export function UsageItem({
  pokemonName,
  count,
  shadowCount,
  totalPlayers,
}: UsageItemProps) {
  const [spriteUrl, setSpriteUrl] = useState<string>("");

  useEffect(() => {
    getSpriteByName(pokemonName).then(setSpriteUrl);
  }, [pokemonName]);

  const percentage = ((count / totalPlayers) * 100).toFixed(1);
  const isAllShadow = shadowCount === count && shadowCount > 0;
  const hasMixedShadow = shadowCount > 0 && shadowCount < count;
  const shadowPercentage = hasMixedShadow
    ? ((shadowCount / count) * 100).toFixed(0)
    : null;

  return (
    <div className="flex flex-col items-center">
      {/* Pokemon sprite container with blue background */}
      <div className="relative w-[80px] h-[80px] bg-[#C1D4FF] rounded-lg flex items-center justify-center">
        {spriteUrl ? (
          <Image
            src={spriteUrl}
            alt={pokemonName}
            width={70}
            height={70}
            className="object-contain"
            unoptimized
          />
        ) : (
          <div className="w-[70px] h-[70px] bg-white/20 rounded animate-pulse" />
        )}

        {/* Shadow icon overlay (if all shadow) */}
        {isAllShadow && (
          <div className="absolute bottom-1 right-1 w-5 h-5">
            <Image
              src="/assets/shadow_icon.png"
              alt="Shadow"
              width={20}
              height={20}
              className="object-contain"
            />
          </div>
        )}
      </div>

      {/* Usage percentage */}
      <div className="mt-1 text-center">
        <span className="text-white text-sm font-bold">{percentage}%</span>

        {/* Shadow percentage (if mixed) */}
        {hasMixedShadow && (
          <span className="text-white/70 text-xs ml-1">
            <Image
              src="/assets/shadow_icon.png"
              alt="Shadow"
              width={12}
              height={12}
              className="inline-block mr-0.5"
            />
            {shadowPercentage}%
          </span>
        )}
      </div>
    </div>
  );
}
