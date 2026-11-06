import { Pause, Play } from "lucide-react";
import type { Frame, FrameMode } from "~/lib/frames";
import { SegmentedControl } from "./SegmentedControl";

interface TimelineControlProps {
  mode: FrameMode;
  onModeChange: (mode: FrameMode) => void;
  frames: Frame[];
  index: number;
  onIndexChange: (index: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
}

const MODES = [
  { value: "snapshots", label: "AA snapshots" },
  { value: "releases", label: "Release replay" },
] as const;

export function TimelineControl({
  mode,
  onModeChange,
  frames,
  index,
  onIndexChange,
  playing,
  onTogglePlay,
}: TimelineControlProps) {
  const last = Math.max(0, frames.length - 1);
  const frame = frames[index];
  const progress = last === 0 ? 1 : index / last;
  const disabled = frames.length < 2;

  return (
    <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center md:gap-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={disabled}
          aria-label={playing ? "Pause timeline" : "Play timeline"}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {playing ? (
            <Pause className="h-4 w-4" fill="currentColor" />
          ) : (
            <Play className="h-4 w-4 translate-x-px" fill="currentColor" />
          )}
        </button>
        <div className="min-w-0">
          <SegmentedControl
            label="Timeline source"
            options={MODES}
            value={mode}
            onChange={onModeChange}
          />
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-4">
          <div className="min-w-0" aria-live="polite">
            <span className="tabular text-base font-semibold">
              {frame?.label ?? "–"}
            </span>
            <span className="ml-3 truncate text-sm text-muted-foreground">
              {frame?.caption}
            </span>
          </div>
          <span className="tabular shrink-0 text-xs text-muted-foreground">
            {frames.length ? `${index + 1} / ${frames.length}` : "0 / 0"}
          </span>
        </div>

        <div className="relative mt-1">
          <div className="pointer-events-none absolute inset-x-[11px] top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-border">
            <div
              className="h-full w-full origin-left rounded-full bg-primary"
              style={{ transform: `scaleX(${progress})` }}
            />
          </div>
          <div className="pointer-events-none absolute inset-x-[11px] top-1/2 -translate-y-1/2">
            {frames.map((f, i) => (
              <span
                key={f.date}
                className={`absolute top-1/2 h-2 w-px -translate-y-1/2 ${i <= index ? "bg-primary" : "bg-muted-foreground/40"}`}
                style={{ left: `${last === 0 ? 100 : (i / last) * 100}%` }}
              />
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={last}
            step={1}
            value={index}
            disabled={disabled}
            onChange={(e) => onIndexChange(Number(e.target.value))}
            aria-label="Timeline position"
            aria-valuetext={
              frame
                ? `${frame.label}${frame.caption ? `, ${frame.caption}` : ""}`
                : undefined
            }
            className="range-input relative disabled:cursor-not-allowed"
          />
        </div>

        <div className="tabular flex justify-between text-xs text-muted-foreground">
          <span>{frames[0]?.label}</span>
          {disabled ? (
            <span>
              {mode === "snapshots"
                ? "One snapshot so far. A new one is saved each time AA changes a score."
                : "Not enough releases to replay."}
            </span>
          ) : (
            <span>{frames[last]?.label}</span>
          )}
        </div>
      </div>
    </div>
  );
}
