import { TOP_COUNT } from "./constants";
import { getAvgPriceEur, isFreeModel } from "./pricing";
import type { Metric, Model } from "./model";

export type EnrichedModel = Model & {
  avgPriceEur: number;
  score: number;
  value: number;
};

export type ModelView = "top" | "all";

export function enrichModel(model: Model, metric: Metric): EnrichedModel {
  const avgPriceEur = getAvgPriceEur(model);
  const score = model.scores[metric] ?? 0;
  const value = avgPriceEur > 0 ? score / avgPriceEur : 999 + score;
  return { ...model, avgPriceEur, score, value };
}

export function buildModelList(
  models: Model[],
  zenFree: Model[],
  view: ModelView,
  metric: Metric,
): { baseModels: EnrichedModel[]; totalCount: number; freeCount: number } {
  const top = models
    .filter((m) => m.scores[metric] != null && m.hasPrice && !isFreeModel(m))
    .sort((a, b) => (b.scores[metric] ?? 0) - (a.scores[metric] ?? 0))
    .slice(0, TOP_COUNT);
  const minTop = top.length
    ? Math.min(...top.map((m) => m.scores[metric] ?? 0))
    : 0;
  const threshold = view === "all" ? minTop - 15 : minTop;
  const filteredFree = zenFree
    .filter(
      (m) =>
        m.providerId === "opencode" &&
        m.scores[metric] != null &&
        (m.scores[metric] ?? 0) >= threshold,
    )
    .sort((a, b) => (b.scores[metric] ?? 0) - (a.scores[metric] ?? 0));
  const seen = new Set<string>();
  const deduped = [...top, ...filteredFree].filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
  const freeCount = deduped.filter((m) => m.providerId === "opencode").length;
  const baseModels = deduped.map((m) => enrichModel(m, metric));
  return { baseModels, totalCount: deduped.length, freeCount };
}

export function rankByMetric(
  models: Model[],
  metric: Metric,
): Map<string, number> {
  const ranked = models
    .filter((m) => m.scores[metric] != null && m.hasPrice && !isFreeModel(m))
    .sort((a, b) => (b.scores[metric] ?? 0) - (a.scores[metric] ?? 0));
  return new Map(ranked.map((m, i) => [m.id, i + 1]));
}
