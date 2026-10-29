import { useMemo, useRef } from "react";
import type { EnrichedModel } from "~/openrouter/enrich";
import { METRIC_LABELS, type Metric } from "~/openrouter/model";
import { isFreeModel } from "~/openrouter/pricing";
import type { Domain, Frame } from "~/lib/frames";
import { labColor } from "~/lib/labs";
import { AnimatedNumber } from "./AnimatedNumber";
import { RankDelta } from "./RankDelta";

interface LeaderboardProps {
  frame: Frame;
  previous: Frame | undefined;
  domain: Domain;
  metric: Metric;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  count?: number;
}

const ROW_H = 56;
const MOVE = "transform 0.8s var(--ease-out-expo), opacity 0.45s var(--ease-out-expo)";

export function Leaderboard({ frame, previous, domain, metric, hoveredId, onHover, count = 10 }: LeaderboardProps) {
  const seen = useRef(new Map<string, { model: EnrichedModel; index: number; visible: boolean }>());

  const rows = useMemo(() => {
    const top = frame.list.slice(0, count);
    const ids = new Set(top.map((m) => m.id));
    for (const r of seen.current.values()) r.visible = ids.has(r.model.id);
    top.forEach((model, index) => seen.current.set(model.id, { model, index, visible: true }));
    return [...seen.current.values()];
  }, [frame, count]);

  const span = Math.max(1, domain.yMax - domain.yMin * 0.6);

  return (
    <section aria-labelledby="leaderboard-title">
      <div className="flex items-baseline justify-between">
        <h2 id="leaderboard-title" className="text-sm font-semibold tracking-tight">
          {METRIC_LABELS[metric]} leaderboard
        </h2>
        <span className="font-mono text-xs text-muted-foreground">{previous ? `vs ${previous.label}` : frame.label}</span>
      </div>
      <ol className="relative mt-3" style={{ height: count * ROW_H }}>
        {rows.map(({ model, index, visible }) => {
          const rank = index + 1;
          const free = isFreeModel(model);
          const fill = Math.max(0.04, (model.score - domain.yMin * 0.6) / span);
          const active = hoveredId === model.id;
          return (
            <li
              key={model.id}
              className="absolute inset-x-0 top-0"
              style={{
                height: ROW_H,
                transform: `translateY(${index * ROW_H}px) translateX(${visible ? 0 : 24}px)`,
                opacity: visible ? 1 : 0,
                transition: MOVE,
                pointerEvents: visible ? "auto" : "none",
              }}
              aria-hidden={!visible}
            >
              <button
                type="button"
                onMouseEnter={() => onHover(model.id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(model.id)}
                onBlur={() => onHover(null)}
                tabIndex={visible ? 0 : -1}
                className={`group flex h-full w-full items-center gap-3 border-b border-border/60 px-1 text-left transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm ${active ? "bg-muted/70" : "hover:bg-muted/40"}`}
              >
                <span className="w-6 shrink-0 font-mono text-sm tabular text-muted-foreground">{rank}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={free ? { boxShadow: "inset 0 0 0 1.5px oklch(var(--foreground))" } : { background: labColor(model.creator) }}
                    />
                    <span className="truncate text-sm font-medium">{model.name}</span>
                    {frame.pareto.has(model.id) && (
                      <span className="sr-only">on the Pareto frontier</span>
                    )}
                  </span>
                  <span className="mt-1.5 block h-[3px] w-full overflow-hidden rounded-full bg-muted">
                    <span
                      className={`block h-full w-full origin-left rounded-full ${frame.pareto.has(model.id) ? "bg-primary" : "bg-foreground/45"}`}
                      style={{ transform: `scaleX(${fill})`, transition: "transform 0.9s var(--ease-out-expo)" }}
                    />
                  </span>
                </span>
                <AnimatedNumber value={model.score} className="w-12 shrink-0 text-right font-mono text-sm font-semibold tabular" />
                <RankDelta current={rank} previous={previous?.ranks.get(model.id)} hasPrevious={!!previous} />
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
