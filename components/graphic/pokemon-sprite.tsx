"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getSpriteByName } from "@/lib/pokemon-sprites";

interface PokemonSpriteProps {
  name: string;
  isShadow: boolean;
  size?: number;
}

export function PokemonSprite({ name, isShadow, size = 40 }: PokemonSpriteProps) {
  const [spriteUrl, setSpriteUrl] = useState<string>("");

  useEffect(() => {
    getSpriteByName(name).then(setSpriteUrl);
  }, [name]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {spriteUrl ? (
        <>
          <Image
            src={spriteUrl}
            alt={name}
            width={size}
            height={size}
            className={`object-contain ${isShadow ? "brightness-75" : ""}`}
            unoptimized
          />
          {/* Shadow icon overlay */}
          {isShadow && (
            <div
              className="absolute bottom-0 right-0"
              style={{ width: size * 0.35, height: size * 0.35 }}
            >
              <Image
                src="/assets/shadow_icon.png"
                alt="Shadow"
                fill
                className="object-contain"
              />
            </div>
          )}
        </>
      ) : (
        <div
          className="bg-white/10 rounded animate-pulse"
          style={{ width: size, height: size }}
        />
      )}
    </div>
  );
}
