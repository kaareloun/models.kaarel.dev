import type { CursorBenchEntry } from "~/openrouter/cursorBench";

export type CursorBenchAxis = "cost" | "tokens" | "steps";

export type CursorBenchSeries = {
  model: string;
  color: string;
  featured: boolean;
  best: number;
  points: CursorBenchEntry[];
};

export const CURSORBENCH_AXES = [
  { value: "cost", label: "Cost" },
  { value: "tokens", label: "Tokens" },
  { value: "steps", label: "Steps" },
] as const;

export const CURSORBENCH_AXIS_TITLES: Record<CursorBenchAxis, string> = {
  cost: "Average cost per task",
  tokens: "Average tokens per task",
  steps: "Average steps per task",
};

const DEFAULT_SHOWN = 8;

export function axisValue(e: CursorBenchEntry, axis: CursorBenchAxis): number {
  if (axis === "cost") return e.costPerTask;
  if (axis === "tokens") return e.tokensPerTask;
  return e.stepsPerTask;
}

export function formatAxisValue(v: number, axis: CursorBenchAxis): string {
  if (axis === "cost") return `$${Number.isInteger(v) ? v : v.toFixed(2)}`;
  if (axis === "tokens")
    return v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v));
  return String(Math.round(v));
}

export function buildSeries(entries: CursorBenchEntry[]): CursorBenchSeries[] {
  const byModel = new Map<string, CursorBenchSeries>();
  for (const e of entries) {
    const s = byModel.get(e.model);
    if (s) {
      s.points.push(e);
      s.best = Math.max(s.best, e.score);
      s.featured ||= e.featured;
    } else {
      byModel.set(e.model, {
        model: e.model,
        color: e.color,
        featured: e.featured,
        best: e.score,
        points: [e],
      });
    }
  }
  return [...byModel.values()].sort((a, b) => b.best - a.best);
}

export function defaultShown(series: CursorBenchSeries[]): Set<string> {
  const featured = series.filter((s) => s.featured);
  return new Set(
    (featured.length > 0 ? featured : series.slice(0, DEFAULT_SHOWN)).map(
      (s) => s.model,
    ),
  );
}
