"use client";

import * as React from "react";
import Image from "next/image";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPokemonById, getPokemonSpriteBySid } from "@/lib/pokemon-data";
import {
  LOW_CONFIDENCE,
  cropRegions,
  loadLocalRecognizer,
  recognizeScreenshot,
  type RecognizedTeam,
} from "@/lib/screenshot-import";
import type { ScreenshotTeam } from "@/lib/screenshot-standings";
import type { PokemonMetadata } from "@/lib/types";
import { PokemonCombobox } from "./pokemon-combobox";

/** One uploaded screenshot and what was found in it. */
interface ScreenshotJob {
  key: string;
  name: string;
  thumb: string; // object URL
  status: "queued" | "working" | "done" | "error";
  message?: string;
  teams: ScreenshotTeam[];
}

type Engine = "idle" | "loading" | "browser" | "server";

// Outside the component: only called from event handlers, never during render.
let jobCounter = 0;

/**
 * Recognized teams as screenshot teams, with their name bar and tiles cut out of `image` (the
 * image the recognizer's boxes refer to) for the review step's side-by-side comparison.
 */
async function toScreenshotTeams(
  teams: RecognizedTeam[],
  image: Blob,
  job: ScreenshotJob
): Promise<ScreenshotTeam[]> {
  return Promise.all(
    teams.map(async (team, i) => {
      const read = team.playerRead ?? team.player;
      // Twice the size they're shown at, so they stay sharp on high-density screens.
      const [[nameRef], tileRefs] = await Promise.all([
        cropRegions(image, [team.nameBox], 64),
        cropRegions(image, team.pokemon.map((p) => p.box), 128),
      ]);
      const pokemon = await Promise.all(
        team.pokemon.map(async (p, j) =>
          // Only keep ids the picker knows; anything else imports as an empty slot.
          (await getPokemonById(p.speciesId))
            ? { id: p.speciesId, isShadow: p.shadow, confidence: p.confidence, ref: tileRefs[j] }
            : { id: "", isShadow: false, confidence: 0, ref: tileRefs[j] }
        )
      );
      return {
        key: `${job.key}-${i}`,
        read,
        dracovizName: team.player && team.player !== read ? team.player : null,
        country: team.country,
        source: team.side ? `${job.name} (${team.side})` : job.name,
        nameRef,
        pokemon,
      };
    })
  );
}

/**
 * Screenshots added to the auto-generate dialog, recognized one after another (the recognizer
 * handles one image at a time) as soon as they're added.
 */
export function useScreenshotTeams() {
  const [jobs, setJobs] = React.useState<ScreenshotJob[]>([]);
  const [engine, setEngine] = React.useState<Engine>("idle");
  const [download, setDownload] = React.useState<{ loaded: number; total: number } | null>(null);
  const queue = React.useRef<Promise<void>>(Promise.resolve());
  // Results that arrive after a reset are dropped.
  const generation = React.useRef(0);

  const updateJob = (key: string, change: Partial<ScreenshotJob>) =>
    setJobs((list) => list.map((j) => (j.key === key ? { ...j, ...change } : j)));

  /** Start loading the in-browser recognizer (downloads its models the first time). */
  const prepare = () => {
    if (engine !== "idle") return;
    setEngine("loading");
    loadLocalRecognizer((loaded, total) => setDownload({ loaded, total })).then((ok) =>
      setEngine(ok ? "browser" : "server")
    );
  };

  const recognize = async (job: ScreenshotJob, file: File, gen: number) => {
    if (gen !== generation.current) return;
    updateJob(job.key, { status: "working" });
    try {
      const { teams, image } = await recognizeScreenshot(file);
      if (gen !== generation.current) return;
      if (teams.length === 0) {
        updateJob(job.key, { status: "error", message: "No team grid found" });
        return;
      }
      const found = await toScreenshotTeams(teams, image, job);
      if (gen !== generation.current) return;
      updateJob(job.key, { status: "done", teams: found });
    } catch (error) {
      if (gen !== generation.current) return;
      updateJob(job.key, { status: "error", message: error instanceof Error ? error.message : "Recognition failed" });
    }
  };

  const addFiles = (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    prepare();
    const gen = generation.current;
    const added = images.map(
      (file): ScreenshotJob => ({
        key: `shot-${++jobCounter}`,
        name: file.name || "pasted image",
        thumb: URL.createObjectURL(file),
        status: "queued",
        teams: [],
      })
    );
    setJobs((list) => [...list, ...added]);
    added.forEach((job, i) => {
      queue.current = queue.current.then(() => recognize(job, images[i], gen));
    });
  };

  const removeJob = (key: string) =>
    setJobs((list) => {
      const job = list.find((j) => j.key === key);
      if (job) URL.revokeObjectURL(job.thumb);
      return list.filter((j) => j.key !== key);
    });

  /** Set a slot's Pokémon or shadow form by hand; a hand-picked slot is as good as certain. */
  const updateSlot = (teamKey: string, slot: number, change: { id?: string; isShadow?: boolean }) =>
    setJobs((list) =>
      list.map((job) =>
        job.teams.some((t) => t.key === teamKey)
          ? {
              ...job,
              teams: job.teams.map((t) =>
                t.key === teamKey
                  ? {
                      ...t,
                      pokemon: t.pokemon.map((p, i) =>
                        i === slot ? { ...p, ...change, confidence: 1, edited: true } : p
                      ),
                    }
                  : t
              ),
            }
          : job
      )
    );

  const reset = () => {
    generation.current++;
    queue.current = Promise.resolve();
    setJobs((list) => {
      list.forEach((j) => URL.revokeObjectURL(j.thumb));
      return [];
    });
  };

  const teams = React.useMemo(() => jobs.flatMap((j) => j.teams), [jobs]);
  const pending = jobs.filter((j) => j.status === "queued" || j.status === "working").length;

  return { jobs, teams, pending, engine, download, prepare, addFiles, removeJob, updateSlot, reset };
}

export type ScreenshotTeamsState = ReturnType<typeof useScreenshotTeams>;

function jobStatus(job: ScreenshotJob, engine: Engine): string {
  if (job.status === "queued") return "Waiting…";
  if (job.status === "error") return job.message ?? "Recognition failed";
  if (job.status === "done") return job.teams.map((t) => t.read || "name not read").join(", ");
  if (engine === "loading") return "Loading the recognizer first…";
  if (engine === "server") return "Sending to the server… (takes about 20 s)";
  return "Finding teams…";
}

/** Drop zone and per-screenshot status for the auto-generate dialog. */
export function ScreenshotTeamsInput({ state, disabled }: { state: ScreenshotTeamsState; disabled?: boolean }) {
  const { jobs, engine, download, addFiles, removeJob } = state;
  const [dragging, setDragging] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground transition-colors",
          dragging && "border-primary bg-primary/5"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) addFiles(Array.from(e.dataTransfer.files));
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
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => fileInput.current?.click()}
        >
          Choose screenshots
        </Button>
        <p className="mt-2 text-xs">or drop them here, or paste with Ctrl/Cmd+V</p>
        <div className="mt-2 text-[11px]">
          {engine === "loading" &&
            (download && download.total > 0 ? (
              <div className="mx-auto max-w-xs space-y-1">
                <p>
                  Downloading the recognizer (first time only)… {Math.round(download.loaded / 1e6)} of{" "}
                  {Math.round(download.total / 1e6)} MB
                </p>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-[width]"
                    style={{ width: `${Math.min(100, (100 * download.loaded) / download.total)}%` }}
                  />
                </div>
              </div>
            ) : (
              <p>Loading the recognizer…</p>
            ))}
          {engine === "browser" && <p>Recognition runs in your browser.</p>}
          {engine === "server" && (
            <p>This browser can&apos;t run the recognizer, so screenshots are sent to the server (slower).</p>
          )}
        </div>
      </div>

      {jobs.length > 0 && (
        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
          {jobs.map((job) => (
            <div
              key={job.key}
              className={cn(
                "flex items-center gap-2 rounded-md border p-1.5",
                job.status === "error" && "border-destructive/40 bg-destructive/5"
              )}
            >
              <Image
                src={job.thumb}
                alt=""
                width={64}
                height={36}
                unoptimized
                className={cn("h-9 w-16 shrink-0 rounded object-cover", job.status === "queued" && "opacity-50")}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{job.name}</p>
                <p
                  className={cn(
                    "flex items-center gap-1 text-[11px]",
                    job.status === "error" ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {job.status === "working" && <Loader2 className="h-3 w-3 shrink-0 animate-spin" />}
                  {job.status === "done" && <CheckCircle2 className="h-3 w-3 shrink-0 text-green-600" />}
                  {job.status === "error" && <AlertCircle className="h-3 w-3 shrink-0" />}
                  <span className="truncate">{jobStatus(job, engine)}</span>
                </p>
              </div>
              {(job.status === "done" || job.status === "error") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  aria-label="Remove screenshot"
                  disabled={disabled}
                  onClick={() => removeJob(job.key)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * One slot: the tile from the screenshot above the Pokémon it was recognized as, which can be
 * clicked to change it.
 */
function SlotComparison({
  slot,
  index,
  selected,
  onSelect,
}: {
  slot: ScreenshotTeam["pokemon"][number];
  index: number;
  selected: boolean;
  onSelect?: () => void;
}) {
  const [pokemon, setPokemon] = React.useState<PokemonMetadata | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (slot.id) getPokemonById(slot.id).then((p) => !cancelled && setPokemon(p));
    else setPokemon(null);
    return () => {
      cancelled = true;
    };
  }, [slot.id]);

  const unsure = !slot.id || slot.confidence < LOW_CONFIDENCE;
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      {slot.ref ? (
        <Image
          src={slot.ref}
          alt={`Tile ${index + 1} in the screenshot`}
          width={64}
          height={64}
          unoptimized
          className="h-16 w-16 rounded-md border bg-black/5 object-contain"
        />
      ) : (
        <div className="h-16 w-16 rounded-md border bg-muted/50" />
      )}
      <button
        type="button"
        onClick={onSelect}
        disabled={!onSelect}
        title={onSelect ? "Change this Pokémon" : undefined}
        aria-label={`Tile ${index + 1}: ${pokemon ? pokemon.speciesName : "not recognized"}${onSelect ? ", change" : ""}`}
        className={cn(
          "relative h-16 w-16 rounded-md border bg-muted/50 flex items-center justify-center p-1",
          onSelect && "hover:border-primary",
          unsure && "border-amber-500 ring-1 ring-amber-500",
          selected && "border-primary ring-2 ring-primary"
        )}
      >
        {pokemon ? (
          <Image
            src={getPokemonSpriteBySid(pokemon.sid)}
            alt={pokemon.speciesName}
            width={56}
            height={56}
            className="object-contain max-w-full max-h-full"
          />
        ) : (
          <span className="text-xs text-muted-foreground">?</span>
        )}
        {slot.isShadow && (
          <Image
            src="/assets/shadow_icon.png"
            alt="Shadow"
            width={18}
            height={18}
            className="absolute bottom-0.5 right-0.5 h-[18px] w-[18px]"
          />
        )}
      </button>
      <p className="w-full text-center text-[11px] leading-tight">
        <span className="block truncate" title={pokemon?.speciesName}>
          {pokemon ? pokemon.speciesName : "Not recognized"}
        </span>
        <span className={cn("text-muted-foreground", unsure && "text-amber-700 dark:text-amber-400")}>
          {slot.isShadow ? "Shadow · " : ""}
          {slot.edited ? "Set by hand" : `${Math.round(slot.confidence * 100)}%`}
        </span>
      </p>
    </div>
  );
}

/**
 * A screenshot team next to what was recognized: the name bar as it appears in the screenshot,
 * then each tile above the Pokémon it was read as, large enough to check by eye. With
 * `onSlotChange`, a tile's Pokémon and shadow form can be changed: clicking it opens a picker.
 */
export function TeamComparison({
  team,
  note,
  editingSlot = null,
  onEditSlot,
  onSlotChange,
}: {
  team: ScreenshotTeam;
  /** Shown after the reading, e.g. how sure the import is */
  note?: React.ReactNode;
  editingSlot?: number | null;
  onEditSlot?: (slot: number | null) => void;
  onSlotChange?: (slot: number, change: { id?: string; isShadow?: boolean }) => void;
}) {
  const editable = Boolean(onEditSlot && onSlotChange);
  const editing = editingSlot !== null ? team.pokemon[editingSlot] : undefined;
  return (
    <div className="space-y-2 py-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {team.nameRef && (
          <Image
            src={team.nameRef}
            alt="Name in the screenshot"
            width={240}
            height={32}
            unoptimized
            className="h-8 w-auto max-w-full rounded border bg-black/5"
          />
        )}
        <span className="text-xs text-muted-foreground">
          Read as <span className="font-medium text-foreground">{team.read || "?"}</span> · {team.source}
        </span>
        {note}
      </div>
      <div className="grid grid-cols-6 gap-2 max-w-[28rem]">
        {team.pokemon.map((slot, i) => (
          <SlotComparison
            key={i}
            slot={slot}
            index={i}
            selected={editingSlot === i}
            onSelect={editable ? () => onEditSlot!(editingSlot === i ? null : i) : undefined}
          />
        ))}
      </div>
      {editable && editing && editingSlot !== null && (
        <div className="max-w-[28rem]">
          <PokemonCombobox
            value={editing.id}
            isShadow={editing.isShadow}
            onValueChange={(id) => onSlotChange!(editingSlot, { id })}
            onShadowChange={(isShadow) => onSlotChange!(editingSlot, { isShadow })}
          />
        </div>
      )}
    </div>
  );
}
