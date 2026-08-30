import { getAvgPriceEur } from "./pricing";
import type { OpenRouterModel } from "./parseData";

export type EnrichedModel = OpenRouterModel & {
  avgPriceEur: number;
  value: number;
};

export type ModelView = "top" | "all";

export function enrichModel(model: OpenRouterModel): EnrichedModel {
  const avgPriceEur = getAvgPriceEur(model);
  const value =
    avgPriceEur > 0 && model.coding_index
      ? model.coding_index / avgPriceEur
      : model.coding_index
        ? 999 + model.coding_index
        : 0;
  return { ...model, avgPriceEur, value };
}

export function buildModelList(
  models: OpenRouterModel[],
  zenFree: OpenRouterModel[],
  view: ModelView,
): { baseModels: EnrichedModel[]; totalCount: number; freeCount: number } {
  const codingValues = models.map((m) => m.coding_index).filter((v): v is number => v != null);
  const minTop20 = codingValues.length ? Math.min(...codingValues) : 0;
  const threshold = view === "all" ? minTop20 - 15 : minTop20;
  const filteredFree = [...zenFree]
    .filter((m) => m.providerId === "opencode" && (m.coding_index ?? 0) >= threshold)
    .sort((a, b) => (b.coding_index ?? 0) - (a.coding_index ?? 0));
  const combined = [...models, ...filteredFree];
  const seen = new Set<string>();
  const deduped = combined.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
  const totalCount = deduped.length;
  const freeCount = deduped.filter((m) => m.providerId === "opencode").length;
  const baseModels = deduped.map(enrichModel);
  return { baseModels, totalCount, freeCount };
}
