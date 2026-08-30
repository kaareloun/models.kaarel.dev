import { EUR_RATE } from "./constants";
import type { OpenRouterModel } from "./parseData";

export function getAvgPriceEur(model: Pick<OpenRouterModel, "cost">): number {
  return ((model.cost.input + model.cost.output) / 2) * 1_000_000 * EUR_RATE;
}

export function isFreeModel(model: Pick<OpenRouterModel, "cost">): boolean {
  return model.cost.input === 0 && model.cost.output === 0;
}

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  return h;
}

export function getChartPrice(model: OpenRouterModel): number {
  if (isFreeModel(model)) {
    const h = hashString(model.id);
    return 0.05 + (h % 5) * 0.04 + ((h * 7) % 3) * 0.015;
  }
  return getAvgPriceEur(model);
}

/**
 * Global Pareto frontier: sorts by price (avgPriceEur) ascending, then coding descending.
 * All free models have avgPriceEur=0, so only the highest coding_index among free will be Pareto.
 * This is intentional — global frontier shows best price/performance across all tiers.
 * If a separate free-tier frontier is desired, compute pareto per isFree group.
 */
export function getParetoIds<T extends { id: string; avgPriceEur: number; coding_index: number | null }>(
  items: T[],
): Set<string> {
  const sorted = [...items].sort(
    (a, b) => a.avgPriceEur - b.avgPriceEur || (b.coding_index ?? 0) - (a.coding_index ?? 0),
  );
  let maxCoding = Number.NEGATIVE_INFINITY;
  const ids = new Set<string>();
  for (const m of sorted) {
    const coding = m.coding_index ?? 0;
    if (coding > maxCoding) {
      ids.add(m.id);
      maxCoding = coding;
    }
  }
  return ids;
}
