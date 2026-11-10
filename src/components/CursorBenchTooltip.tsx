import type { CursorBenchEntry } from "~/openrouter/cursorBench";

interface CursorBenchTooltipProps {
  entry: CursorBenchEntry;
  x: number;
  y: number;
  containerWidth: number;
}

export function CursorBenchTooltip({
  entry,
  x,
  y,
  containerWidth,
}: CursorBenchTooltipProps) {
  const flip = x > containerWidth - 220;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 w-[200px] rounded-md border border-border bg-popover px-3 py-2.5 text-sm"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${flip ? x - 216 : x + 16}px, ${Math.max(0, y - 40)}px)`,
        boxShadow: "0 8px 20px -12px oklch(var(--shadow-tint) / 0.5)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: entry.color }}
        />
        <span className="truncate font-semibold leading-tight">
          {entry.model}
        </span>
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {entry.creator}
        {entry.effort ? ` · ${entry.effort}` : ""}
      </div>
      <dl className="tabular mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Score</dt>
        <dd className="text-right font-semibold">{entry.score.toFixed(1)}%</dd>
        <dt className="text-muted-foreground">Cost / task</dt>
        <dd className="text-right">${entry.costPerTask.toFixed(2)}</dd>
        <dt className="text-muted-foreground">Tokens / task</dt>
        <dd className="text-right">
          {entry.tokensPerTask.toLocaleString("en-US")}
        </dd>
        <dt className="text-muted-foreground">Steps / task</dt>
        <dd className="text-right">{entry.stepsPerTask}</dd>
      </dl>
    </div>
  );
}
