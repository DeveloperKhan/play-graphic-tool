"use client";

import * as React from "react";
import Image from "next/image";
import { ImageUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getPokemonById, getPokemonSpriteBySid } from "@/lib/pokemon-data";
import { getFlagsForPlayer } from "@/lib/player-flag-config";
import { LOW_CONFIDENCE, normalizeName, recognizeScreenshot } from "@/lib/screenshot-import";
import type { PokemonMetadata } from "@/lib/types";
import { PokemonCombobox } from "./pokemon-combobox";

interface ImportedPlayer {
  name: string;
  flags: string[];
  team: Array<{ id: string; isShadow: boolean }>;
}

interface ReviewSlot {
  id: string;
  isShadow: boolean;
  confidence: number;
}

interface ReviewEntry {
  key: string;
  source: string;
  include: boolean;
  name: string;
  /** What OCR read, when it differs from the matched Dracoviz name. */
  read?: string;
  flags: string[];
  team: ReviewSlot[];
  note?: string;
}

interface ScreenshotImportDialogProps {
  /** Names already in the form, so re-imported players can be skipped. */
  getExistingNames: () => string[];
  getEmptySlotCount: () => number;
  /** Fills empty slots in bracket order; returns how many players were placed. */
  onImport: (players: ImportedPlayer[]) => number;
}

function RecognizedSprite({
  slot,
  selected,
  onClick,
}: {
  slot: ReviewSlot;
  selected: boolean;
  onClick: () => void;
}) {
  const [pokemon, setPokemon] = React.useState<PokemonMetadata | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (slot.id) {
      getPokemonById(slot.id).then((p) => !cancelled && setPokemon(p));
    } else {
      setPokemon(null);
    }
    return () => {
      cancelled = true;
    };
  }, [slot.id]);

  const unsure = !slot.id || slot.confidence < LOW_CONFIDENCE;
  return (
    <button
      type="button"
      onClick={onClick}
      title={
        pokemon
          ? `${pokemon.speciesName}${slot.isShadow ? " (Shadow)" : ""} · ${Math.round(slot.confidence * 100)}%`
          : "Not recognized: click to choose"
      }
      className={cn(
        "relative w-12 h-12 rounded-md border bg-muted/50 flex items-center justify-center p-1",
        unsure && "border-amber-500 ring-1 ring-amber-500",
        selected && "border-primary ring-2 ring-primary"
      )}
    >
      {pokemon ? (
        <Image
          src={getPokemonSpriteBySid(pokemon.sid)}
          alt={pokemon.speciesName}
          width={40}
          height={40}
          className="object-contain max-w-full max-h-full"
        />
      ) : (
        <span className="text-[10px] text-muted-foreground">?</span>
      )}
      {slot.isShadow && (
        <Image
          src="/assets/shadow_icon.png"
          alt="Shadow"
          width={14}
          height={14}
          className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5"
        />
      )}
    </button>
  );
}

export function ScreenshotImportDialog({
  getExistingNames,
  getEmptySlotCount,
  onImport,
}: ScreenshotImportDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [entries, setEntries] = React.useState<ReviewEntry[]>([]);
  const [pending, setPending] = React.useState(0);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [editing, setEditing] = React.useState<{ key: string; slot: number } | null>(null);
  const [emptySlots, setEmptySlots] = React.useState(0);
  const fileInput = React.useRef<HTMLInputElement>(null);

  const reset = () => {
    setEntries([]);
    setErrors([]);
    setEditing(null);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setEmptySlots(getEmptySlotCount());
    } else {
      reset();
    }
  };

  const toEntries = async (teams: Awaited<ReturnType<typeof recognizeScreenshot>>, source: string) =>
    Promise.all(
      teams.map(async (team, i): Promise<ReviewEntry> => {
        const name = team.player?.trim() ?? "";
        const slots = await Promise.all(
          team.pokemon.map(async (p) => {
            // Only keep ids the picker knows; anything else is left for the user to choose.
            const known = await getPokemonById(p.speciesId);
            return known
              ? { id: p.speciesId, isShadow: p.shadow, confidence: p.confidence }
              : { id: "", isShadow: false, confidence: 0 };
          })
        );
        return {
          key: `${source}-${Date.now()}-${i}`,
          source: team.side ? `${source} (${team.side})` : source,
          include: true,
          name,
          read: team.playerRead && team.playerRead !== name ? team.playerRead : undefined,
          flags: getFlagsForPlayer(name) ?? (team.country ? [team.country] : [""]),
          team: slots,
        };
      })
    );

  const addFiles = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setPending((n) => n + images.length);
    await Promise.all(
      images.map(async (file) => {
        const source = file.name || "pasted image";
        try {
          const teams = await recognizeScreenshot(file);
          if (teams.length === 0) {
            setErrors((e) => [...e, `${source}: no team grid found`]);
          } else {
            const recognized = await toEntries(teams, source);
            setEntries((current) => markDuplicates([...current, ...recognized]));
          }
        } catch (error) {
          setErrors((e) => [...e, `${source}: ${error instanceof Error ? error.message : "failed"}`]);
        } finally {
          setPending((n) => n - 1);
        }
      })
    );
  };

  // The same player often appears in several screenshots, and may already be in the bracket.
  const markDuplicates = (list: ReviewEntry[]): ReviewEntry[] => {
    const existing = new Set(getExistingNames().map(normalizeName));
    const seen = new Set<string>();
    return list.map((entry) => {
      const key = normalizeName(entry.name);
      if (entry.note || !key) return entry;
      if (existing.has(key)) return { ...entry, include: false, note: "Already in the bracket" };
      if (seen.has(key)) return { ...entry, include: false, note: "Duplicate of a team above" };
      seen.add(key);
      return entry;
    });
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const files = Array.from(event.clipboardData.files);
    if (files.length) {
      event.preventDefault();
      addFiles(files);
    }
  };

  const updateEntry = (key: string, change: (entry: ReviewEntry) => ReviewEntry) =>
    setEntries((list) => list.map((e) => (e.key === key ? change(e) : e)));

  const updateSlot = (key: string, index: number, change: Partial<ReviewSlot>) =>
    updateEntry(key, (e) => ({
      ...e,
      // A hand-picked Pokémon is as good as certain.
      team: e.team.map((s, i) => (i === index ? { ...s, ...change, confidence: 1 } : s)),
    }));

  const selected = entries.filter((e) => e.include);

  const handleFill = () => {
    const placed = onImport(
      selected.map((e) => ({
        name: e.name.trim(),
        flags: e.flags,
        team: e.team.map(({ id, isShadow }) => ({ id, isShadow })),
      }))
    );
    if (placed > 0) handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="text-xs">
          <ImageUp className="h-3 w-3 mr-1" />
          Import Screenshot
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col" onPaste={handlePaste}>
        <DialogHeader>
          <DialogTitle>Import Teams from Screenshots</DialogTitle>
          <DialogDescription>
            Upload or paste screenshots of the broadcast overlay (a full frame or a cropped player panel). Review
            the recognized teams, then fill them into the empty slots in bracket order.
          </DialogDescription>
        </DialogHeader>

        <div
          className="border-2 border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(Array.from(e.dataTransfer.files));
          }}
        >
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <Button type="button" variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
            Choose images
          </Button>
          <p className="mt-2 text-xs">or drop them here, or paste with Ctrl/Cmd+V</p>
          {pending > 0 && (
            <p className="mt-2 flex items-center justify-center gap-2 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              Recognizing {pending} screenshot{pending === 1 ? "" : "s"}… (first one can take ~15 s)
            </p>
          )}
        </div>

        {errors.length > 0 && (
          <div className="text-xs text-destructive space-y-1">
            {errors.map((error, i) => (
              <p key={i}>{error}</p>
            ))}
          </div>
        )}

        {entries.length > 0 && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
            {entries.map((entry) => (
              <div
                key={entry.key}
                className={cn("rounded-lg border p-3 space-y-2", !entry.include && "opacity-60")}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={entry.include}
                    onCheckedChange={(checked) => updateEntry(entry.key, (e) => ({ ...e, include: checked === true }))}
                    aria-label="Include this team"
                  />
                  <Input
                    value={entry.name}
                    placeholder="Player name"
                    onChange={(ev) => updateEntry(entry.key, (e) => ({ ...e, name: ev.target.value }))}
                    className="h-8 text-sm"
                  />
                  <Input
                    value={entry.flags.filter(Boolean).join(" ")}
                    placeholder="Flag"
                    title="Country code(s), e.g. US or CO CA"
                    onChange={(ev) => {
                      const codes = ev.target.value.toUpperCase().split(/[\s,]+/).filter(Boolean).slice(0, 2);
                      updateEntry(entry.key, (e) => ({ ...e, flags: codes.length ? codes : [""] }));
                    }}
                    className="h-8 w-20 text-sm uppercase"
                  />
                </div>
                {entry.read && (
                  <p className="pl-6 text-[11px] text-muted-foreground">
                    Matched to a Dracoviz player · read as {entry.read}
                  </p>
                )}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {entry.team.map((slot, i) => (
                    <RecognizedSprite
                      key={i}
                      slot={slot}
                      selected={editing?.key === entry.key && editing.slot === i}
                      onClick={() =>
                        setEditing((cur) =>
                          cur?.key === entry.key && cur.slot === i ? null : { key: entry.key, slot: i }
                        )
                      }
                    />
                  ))}
                  <span className="ml-auto text-[11px] text-muted-foreground truncate max-w-[40%]">
                    {entry.note ?? entry.source}
                  </span>
                </div>
                {editing?.key === entry.key && (
                  <PokemonCombobox
                    value={entry.team[editing.slot].id}
                    isShadow={entry.team[editing.slot].isShadow}
                    onValueChange={(id) => updateSlot(entry.key, editing.slot, { id })}
                    onShadowChange={(isShadow) => updateSlot(entry.key, editing.slot, { isShadow })}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:items-center">
          <p className="text-xs text-muted-foreground sm:mr-auto">
            {selected.length} team{selected.length === 1 ? "" : "s"} selected · {emptySlots} empty slot
            {emptySlots === 1 ? "" : "s"}
            {selected.length > emptySlots && ` · only the first ${emptySlots} will be added`}
          </p>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleFill} disabled={selected.length === 0 || emptySlots === 0 || pending > 0}>
            Fill empty slots
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
