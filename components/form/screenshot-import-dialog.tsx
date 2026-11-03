"use client";

import * as React from "react";
import Image from "next/image";
import { AlertCircle, ImageUp, Loader2, X } from "lucide-react";
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
import {
  LOW_CONFIDENCE,
  cropRegions,
  normalizeName,
  loadLocalRecognizer,
  recognizeScreenshot,
  type RecognizedTeam,
} from "@/lib/screenshot-import";
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
  /** The tile as it appears in the screenshot (data URL). */
  ref?: string;
}

interface ReviewEntry {
  key: string;
  source: string;
  include: boolean;
  name: string;
  /** What OCR read, when it differs from the matched Dracoviz name. */
  read?: string;
  /** The name bar as it appears in the screenshot (data URL). */
  nameRef?: string;
  flags: string[];
  team: ReviewSlot[];
  note?: string;
}

/** A screenshot being recognized; it disappears once its teams appear below. */
interface Job {
  key: string;
  name: string;
  thumb: string; // object URL
  status: "queued" | "working" | "error";
  started?: number;
  message?: string;
}

// Outside the component: only called from event handlers and timers, never during render.
const clock = () => Date.now();
let jobCounter = 0;

interface ScreenshotImportDialogProps {
  /** Names already in the form, so re-imported players can be skipped. */
  getExistingNames: () => string[];
  getEmptySlotCount: () => number;
  /** Fills empty slots in bracket order; returns how many players were placed. */
  onImport: (players: ImportedPlayer[]) => number;
}

/** A region cut from the uploaded screenshot, shown as-is for comparison. */
function ScreenshotCrop({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={alt}
      width={96}
      height={96}
      unoptimized
      className={cn("rounded-md border bg-black/5 object-contain", className)}
    />
  );
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
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [now, setNow] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  // Screenshots are recognized one after another (the recognizer handles one at a time), and
  // results from before the dialog was closed are dropped.
  const queue = React.useRef<Promise<void>>(Promise.resolve());
  const generation = React.useRef(0);
  const [editing, setEditing] = React.useState<{ key: string; slot: number } | null>(null);
  const [emptySlots, setEmptySlots] = React.useState(0);
  // Loading the in-browser recognizer: bytes downloaded / total, then whether it's usable.
  const [download, setDownload] = React.useState<{ loaded: number; total: number } | null>(null);
  const [engine, setEngine] = React.useState<"loading" | "browser" | "server">("loading");
  const fileInput = React.useRef<HTMLInputElement>(null);

  const busy = jobs.some((j) => j.status !== "error");

  // Tick while something is running so elapsed times stay live.
  React.useEffect(() => {
    if (!jobs.some((j) => j.status === "working")) return;
    const timer = setInterval(() => setNow(clock()), 500);
    return () => clearInterval(timer);
  }, [jobs]);

  const updateJob = (key: string, change: Partial<Job>) =>
    setJobs((list) => list.map((j) => (j.key === key ? { ...j, ...change } : j)));

  const removeJob = (key: string) =>
    setJobs((list) => {
      const job = list.find((j) => j.key === key);
      if (job) URL.revokeObjectURL(job.thumb);
      return list.filter((j) => j.key !== key);
    });

  const reset = () => {
    generation.current++;
    queue.current = Promise.resolve();
    setJobs((list) => {
      list.forEach((j) => URL.revokeObjectURL(j.thumb));
      return [];
    });
    setEntries([]);
    setEditing(null);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setEmptySlots(getEmptySlotCount());
      // Start downloading the models while the user picks screenshots (cached after the first time).
      loadLocalRecognizer((loaded, total) => setDownload({ loaded, total })).then((ok) =>
        setEngine(ok ? "browser" : "server")
      );
    } else {
      reset();
    }
  };

  const toEntries = async (teams: RecognizedTeam[], image: Blob, source: string) =>
    Promise.all(
      teams.map(async (team, i): Promise<ReviewEntry> => {
        const name = team.player?.trim() ?? "";
        const [[nameRef], tileRefs] = await Promise.all([
          cropRegions(image, [team.nameBox], 40),
          cropRegions(image, team.pokemon.map((p) => p.box)),
        ]);
        const slots = await Promise.all(
          team.pokemon.map(async (p, j) => {
            // Only keep ids the picker knows; anything else is left for the user to choose.
            const known = await getPokemonById(p.speciesId);
            return known
              ? { id: p.speciesId, isShadow: p.shadow, confidence: p.confidence, ref: tileRefs[j] }
              : { id: "", isShadow: false, confidence: 0, ref: tileRefs[j] };
          })
        );
        return {
          key: `${source}-${Date.now()}-${i}`,
          source: team.side ? `${source} (${team.side})` : source,
          include: true,
          name,
          read: team.playerRead && team.playerRead !== name ? team.playerRead : undefined,
          nameRef,
          flags: getFlagsForPlayer(name) ?? (team.country ? [team.country] : [""]),
          team: slots,
        };
      })
    );

  const recognizeJob = async (job: Job, file: File, gen: number) => {
    if (gen !== generation.current) return;
    const started = clock();
    setNow(started);
    updateJob(job.key, { status: "working", started });
    try {
      const { teams, image } = await recognizeScreenshot(file);
      if (gen !== generation.current) return;
      if (teams.length === 0) {
        updateJob(job.key, {
          status: "error",
          message: "No team grid found. Is this a screenshot of the 2027 broadcast overlay?",
        });
        return;
      }
      const recognized = await toEntries(teams, image, job.name);
      if (gen !== generation.current) return;
      setEntries((current) => markDuplicates([...current, ...recognized]));
      removeJob(job.key);
    } catch (error) {
      if (gen !== generation.current) return;
      updateJob(job.key, { status: "error", message: error instanceof Error ? error.message : "Recognition failed" });
    }
  };

  const addFiles = (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    const gen = generation.current;
    const added = images.map(
      (file): Job => ({
        key: `job-${++jobCounter}`,
        name: file.name || "pasted image",
        thumb: URL.createObjectURL(file),
        status: "queued",
      })
    );
    setJobs((list) => [...list, ...added]);
    added.forEach((job, i) => {
      queue.current = queue.current.then(() => recognizeJob(job, images[i], gen));
    });
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

  const jobStatus = (job: Job): string => {
    if (job.status === "queued") return "Waiting…";
    if (job.status === "error") return job.message ?? "Recognition failed";
    const seconds = Math.max(0, Math.floor((now - (job.started ?? now)) / 1000));
    if (engine === "loading") return "Loading the recognizer first…";
    if (engine === "server") return `Sending to the server… ${seconds} s (takes about 20 s)`;
    return `Finding teams… ${seconds} s`;
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
          <div className="space-y-2">
            {jobs.map((job) => (
              <div
                key={job.key}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-2",
                  job.status === "error" && "border-destructive/40 bg-destructive/5"
                )}
              >
                <Image
                  src={job.thumb}
                  alt=""
                  width={80}
                  height={48}
                  unoptimized
                  className={cn("h-12 w-20 rounded object-cover", job.status === "queued" && "opacity-50")}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{job.name}</p>
                  <p
                    className={cn(
                      "flex items-center gap-1.5 text-xs",
                      job.status === "error" ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {job.status === "working" && <Loader2 className="h-3 w-3 shrink-0 animate-spin" />}
                    {job.status === "error" && <AlertCircle className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{jobStatus(job)}</span>
                  </p>
                </div>
                {job.status === "error" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    aria-label="Dismiss"
                    onClick={() => removeJob(job.key)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
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
                {(entry.nameRef || entry.read) && (
                  <div className="flex items-center gap-2 pl-6">
                    <ScreenshotCrop src={entry.nameRef} alt="Name in the screenshot" className="h-7 w-auto max-w-[55%]" />
                    {entry.read && (
                      <span className="text-[11px] text-muted-foreground">
                        Matched to a Dracoviz player · read as {entry.read}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-end gap-1.5 flex-wrap">
                  {entry.team.map((slot, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <ScreenshotCrop src={slot.ref} alt={`Tile ${i + 1} in the screenshot`} className="w-12 h-12" />
                      <RecognizedSprite
                        slot={slot}
                        selected={editing?.key === entry.key && editing.slot === i}
                        onClick={() =>
                          setEditing((cur) =>
                            cur?.key === entry.key && cur.slot === i ? null : { key: entry.key, slot: i }
                          )
                        }
                      />
                    </div>
                  ))}
                  <span className="ml-auto self-center text-[11px] text-muted-foreground truncate max-w-[30%]">
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
          <Button type="button" onClick={handleFill} disabled={selected.length === 0 || emptySlots === 0 || busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Recognizing…
              </>
            ) : (
              "Fill empty slots"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
