import { useMemo, useRef } from "react";
import type { EnrichedModel } from "~/openrouter/enrich";
import { METRIC_LABELS, type Metric } from "~/openrouter/model";
import { isFreeModel } from "~/openrouter/pricing";
import type { Frame } from "~/lib/frames";
import { labColor } from "~/lib/labs";
import { RankDelta } from "./RankDelta";

interface LeaderboardProps {
  frame: Frame;
  previous: Frame | undefined;
  metric: Metric;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}

const COUNT = 10;
const ROW_H = 44;
const MOVE =
  "transform 0.8s var(--ease-out-expo), opacity 0.45s var(--ease-out-expo)";

export function Leaderboard({
  frame,
  previous,
  metric,
  hoveredId,
  onHover,
}: LeaderboardProps) {
  const seen = useRef(
    new Map<
      string,
      { model: EnrichedModel; index: number; visible: boolean }
    >(),
  );

  const rows = useMemo(() => {
    const top = frame.list.slice(0, COUNT);
    const ids = new Set(top.map((m) => m.id));
    for (const r of seen.current.values()) r.visible = ids.has(r.model.id);
    top.forEach((model, index) =>
      seen.current.set(model.id, { model, index, visible: true }),
    );
    return [...seen.current.values()];
  }, [frame]);

  return (
    <section aria-labelledby="leaderboard-title">
      <div className="flex items-baseline justify-between">
        <h2 id="leaderboard-title" className="text-sm font-semibold">
          {METRIC_LABELS[metric]} leaderboard
        </h2>
        <span className="text-xs text-muted-foreground">
          {previous ? `vs ${previous.label}` : frame.label}
        </span>
      </div>
      <ol className="relative mt-3" style={{ height: COUNT * ROW_H }}>
        {rows.map(({ model, index, visible }) => {
          const rank = index + 1;
          const free = isFreeModel(model);
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
                className={`group flex h-full w-full items-center gap-3 rounded-sm border-b border-border/60 px-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-muted/70" : "hover:bg-muted/40"}`}
              >
                <span className="tabular w-6 shrink-0 text-sm text-muted-foreground">
                  {rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={
                        free
                          ? {
                              boxShadow:
                                "inset 0 0 0 1.5px oklch(var(--foreground))",
                            }
                          : { background: labColor(model.creator) }
                      }
                    />
                    <span className="truncate text-sm font-medium">
                      {model.name}
                    </span>
                    {frame.pareto.has(model.id) && (
                      <span className="sr-only">on the Pareto frontier</span>
                    )}
                  </span>
                </span>
                <span
                  className={`tabular w-12 shrink-0 text-right text-sm font-semibold ${frame.pareto.has(model.id) ? "text-primary" : ""}`}
                >
                  {model.score.toFixed(1)}
                </span>
                <RankDelta
                  current={rank}
                  previous={previous?.ranks.get(model.id)}
                  hasPrevious={!!previous}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
