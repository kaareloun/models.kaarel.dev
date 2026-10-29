import { EUR_RATE } from "./constants";
import type { Model } from "./model";

export function getAvgPriceEur(model: Pick<Model, "cost">): number {
  return ((model.cost.input + model.cost.output) / 2) * EUR_RATE;
}

export function isFreeModel(model: Pick<Model, "cost">): boolean {
  return model.cost.input === 0 && model.cost.output === 0;
}

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  return h;
}

export function getChartPrice(model: Pick<Model, "id" | "cost">): number {
  if (isFreeModel(model)) {
    const h = hashString(model.id);
    return 0.05 + (h % 5) * 0.04 + ((h * 7) % 3) * 0.015;
  }
  return getAvgPriceEur(model);
}

export function getParetoIds<T extends { id: string; avgPriceEur: number; score: number }>(items: T[]): Set<string> {
  const sorted = [...items].sort((a, b) => a.avgPriceEur - b.avgPriceEur || b.score - a.score);
  let maxScore = Number.NEGATIVE_INFINITY;
  const ids = new Set<string>();
  for (const m of sorted) {
    if (m.score > maxScore) {
      ids.add(m.id);
      maxScore = m.score;
    }
  }
  return ids;
}
