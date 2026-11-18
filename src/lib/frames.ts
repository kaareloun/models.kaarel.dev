import {
  buildModelList,
  type EnrichedModel,
  type ModelView,
} from "~/openrouter/enrich";
import {
  METRICS,
  type Metric,
  type Model,
} from "~/openrouter/model";
import { getParetoIds, isFreeModel } from "~/openrouter/pricing";

export interface Frame {
  date: string;
  label: string;
  caption: string;
  list: EnrichedModel[];
  ranks: Map<string, number>;
  pareto: Set<string>;
}

export interface FrameDiff {
  entered: EnrichedModel[];
  dropped: EnrichedModel[];
  leaderChanged: boolean;
  scoreChanges: Map<string, number>;
}

export interface Domain {
  yMin: number;
  yMax: number;
  xMax: number;
}

const MIN_SCORED_MODELS = 5;

export function availableMetrics(models: Model[]): Metric[] {
  return METRICS.filter(
    (metric) =>
      models.filter(
        (m) => m.hasPrice && !isFreeModel(m) && m.scores[metric] != null,
      ).length >= MIN_SCORED_MODELS,
  );
}

function makeFrame(
  date: string,
  label: string,
  caption: string,
  list: EnrichedModel[],
): Frame {
  const sorted = [...list].sort(
    (a, b) => b.score - a.score || a.avgPriceEur - b.avgPriceEur,
  );
  return {
    date,
    label,
    caption,
    list: sorted,
    ranks: new Map(sorted.map((m, i) => [m.id, i + 1])),
    pareto: getParetoIds(sorted),
  };
}

function signature(list: EnrichedModel[]): string {
  return list
    .map((m) => `${m.id}:${m.score}`)
    .sort()
    .join("|");
}

function formatDay(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function releaseFrames(
  models: Model[],
  zenFree: Model[],
  view: ModelView,
  metric: Metric,
): Frame[] {
  const candidates = [...models, ...zenFree].filter(
    (m) => m.scores[metric] != null && m.release_date,
  );
  const dates = [...new Set(candidates.map((m) => m.release_date))].sort();
  const frames: Frame[] = [];
  let previous = "";
  for (const date of dates) {
    const baseModels = buildModelList(
      models.filter((m) => m.release_date <= date),
      zenFree.filter((m) => m.release_date <= date),
      view,
      metric,
    );
    if (baseModels.length === 0) continue;
    const sig = signature(baseModels);
    if (sig === previous) continue;
    previous = sig;
    const released = candidates
      .filter((m) => m.release_date === date && !isFreeModel(m))
      .map((m) => m.name);
    frames.push(
      makeFrame(
        date,
        formatDay(date),
        released.length ? `${released.join(", ")} released` : "",
        baseModels,
      ),
    );
  }
  return frames;
}

export function diffFrames(
  current: Frame,
  previous: Frame | undefined,
): FrameDiff {
  if (!previous)
    return {
      entered: [],
      dropped: [],
      leaderChanged: false,
      scoreChanges: new Map(),
    };
  const prevById = new Map(previous.list.map((m) => [m.id, m]));
  const curIds = new Set(current.list.map((m) => m.id));
  const scoreChanges = new Map<string, number>();
  for (const m of current.list) {
    const p = prevById.get(m.id);
    if (p && Math.abs(p.score - m.score) >= 0.05)
      scoreChanges.set(m.id, m.score - p.score);
  }
  return {
    entered: current.list.filter((m) => !prevById.has(m.id)),
    dropped: previous.list.filter((m) => !curIds.has(m.id)),
    leaderChanged: current.list[0]?.id !== previous.list[0]?.id,
    scoreChanges,
  };
}

export function frameDomain(frames: Frame[]): Domain {
  const all = frames.flatMap((f) => f.list);
  if (all.length === 0) return { yMin: 0, yMax: 100, xMax: 10 };
  const scores = all.map((m) => m.score);
  return {
    yMin: Math.max(0, Math.floor(Math.min(...scores) - 2)),
    yMax: Math.ceil(Math.max(...scores) + 2),
    xMax: Math.max(...all.map((m) => m.avgPriceEur), 1),
  };
}
