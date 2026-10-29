import type { EnrichedModel } from "~/openrouter/enrich";
import { METRIC_LABELS, type Metric } from "~/openrouter/model";
import { isFreeModel } from "~/openrouter/pricing";
import { labColor } from "~/lib/labs";

interface ChartTooltipProps {
  model: EnrichedModel;
  rank: number | null;
  metric: Metric;
  isPareto: boolean;
  x: number;
  y: number;
  containerWidth: number;
}

export function ChartTooltip({
  model,
  rank,
  metric,
  isPareto,
  x,
  y,
  containerWidth,
}: ChartTooltipProps) {
  const flip = x > containerWidth - 240;
  const free = isFreeModel(model);
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 w-[220px] rounded-[14px] border border-border/80 bg-popover/95 px-4 py-3 text-sm backdrop-blur-md"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${flip ? x - 236 : x + 16}px, ${Math.max(0, y - 40)}px)`,
        boxShadow: "0 24px 48px -20px oklch(var(--shadow-tint) / 0.55)",
        animation: "fade-in 0.2s var(--ease-out-expo)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={
            free
              ? { boxShadow: "inset 0 0 0 2px oklch(var(--foreground))" }
              : { background: labColor(model.creator) }
          }
        />
        <span className="truncate font-semibold leading-tight">
          {model.name}
        </span>
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {model.creator}
        {model.variants[metric] ? ` · ${model.variants[metric]}` : ""}
      </div>
      <dl className="tabular mt-3 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs">
        <dt className="text-muted-foreground">{METRIC_LABELS[metric]}</dt>
        <dd className="text-right font-semibold">{model.score.toFixed(1)}</dd>
        <dt className="text-muted-foreground">Rank</dt>
        <dd className="text-right">{rank ? `#${rank}` : "–"}</dd>
        <dt className="text-muted-foreground">Price</dt>
        <dd className="text-right">
          {free ? "free" : `€${model.avgPriceEur.toFixed(2)}`}
        </dd>
        <dt className="text-muted-foreground">Released</dt>
        <dd className="text-right">{model.release_date || "–"}</dd>
      </dl>
      {isPareto && (
        <div className="mt-2 text-xs font-medium text-primary">
          On the price–performance frontier
        </div>
      )}
    </div>
  );
}
