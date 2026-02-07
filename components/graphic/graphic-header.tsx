"use client";

import Image from "next/image";

interface GraphicHeaderProps {
  eventName: string;
  eventYear: string;
  eventType: "Regional" | "International" | "Worlds" | "Generic";
}

export function GraphicHeader({
  eventName,
  eventYear,
  eventType,
}: GraphicHeaderProps) {
  // Get the logo based on event type
  const logoSrc =
    eventType === "Regional"
      ? "/assets/graphic/regional.png"
      : eventType === "International"
        ? "/assets/graphic/regional.png" // TODO: Add international logo
        : eventType === "Worlds"
          ? "/assets/graphic/regional.png" // TODO: Add worlds logo
          : "/assets/graphic/generic.png";

  return (
    <div className="flex items-start gap-4 p-4">
      {/* Regional Championship Logo */}
      <div className="relative w-[120px] h-[120px] shrink-0">
        <Image
          src={logoSrc}
          alt={`${eventType} Championship`}
          fill
          className="object-contain"
        />
      </div>

      {/* Event Title */}
      <div className="flex flex-col justify-center pt-2">
        <p className="text-white/80 text-sm uppercase tracking-wider">
          {eventYear} Pokemon GO Championship Series
        </p>
        <h1 className="text-white text-3xl font-bold uppercase tracking-tight leading-tight">
          {eventName}
        </h1>
        <p className="text-white text-2xl font-bold uppercase tracking-tight">
          Championships
        </p>
      </div>
    </div>
  );
}
