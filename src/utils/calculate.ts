import { ModelData, Weights } from "~/types";

export function calculateCompositeScore(
  model: ModelData,
  weights: Weights,
  stats: {
    minCost: number;
    maxCost: number;
    minSpeed: number;
    maxSpeed: number;
    minLatency: number;
    maxLatency: number;
    minIntelligence: number;
    maxIntelligence: number;
  },
): number {
  const safeDivide = (a: number, b: number) => (b === 0 ? 0 : a / b);

  const {
    minCost,
    maxCost,
    minSpeed,
    maxSpeed,
    minLatency,
    maxLatency,
    minIntelligence,
    maxIntelligence,
  } = stats;

  // Cost: lower is better
  const costScore =
    model.pricePerMillionTokensInCents == null
      ? 0
      : 1 -
        safeDivide(
          model.pricePerMillionTokensInCents - minCost,
          maxCost - minCost,
        );

  // Speed: higher is better
  const speedScore =
    model.outputTokensPerSecond == null
      ? 0
      : safeDivide(model.outputTokensPerSecond - minSpeed, maxSpeed - minSpeed);

  // Latency: lower is better
  const latencyScore =
    model.latency == null
      ? 0
      : 1 - safeDivide(model.latency - minLatency, maxLatency - minLatency);

  // Intelligence: higher is better
  const intelligenceScore =
    model.intelligenceIndex == null
      ? 0
      : safeDivide(
          model.intelligenceIndex - minIntelligence,
          maxIntelligence - minIntelligence,
        );

  // Normalize weights
  const totalWeight =
    weights.cost + weights.speed + weights.latency + weights.intelligence;

  if (totalWeight === 0) return 0;

  const normalizedWeights = {
    cost: weights.cost / totalWeight,
    speed: weights.speed / totalWeight,
    latency: weights.latency / totalWeight,
    intelligence: weights.intelligence / totalWeight,
  };

  const compositeScore =
    costScore * normalizedWeights.cost +
    speedScore * normalizedWeights.speed +
    latencyScore * normalizedWeights.latency +
    intelligenceScore * normalizedWeights.intelligence;

  return Math.max(0, Math.min(100, compositeScore * 100)); // Clamp 0–100
}

export function computeGlobalStats(models: ModelData[]) {
  const numeric = <K extends keyof ModelData>(key: K) =>
    models.map((m) => m[key]).filter((v) => typeof v === "number");

  return {
    minCost: Math.min(...numeric("pricePerMillionTokensInCents")),
    maxCost: Math.max(...numeric("pricePerMillionTokensInCents")),
    minSpeed: Math.min(...numeric("outputTokensPerSecond")),
    maxSpeed: Math.max(...numeric("outputTokensPerSecond")),
    minLatency: Math.min(...numeric("latency")),
    maxLatency: Math.max(...numeric("latency")),
    minIntelligence: Math.min(...numeric("intelligenceIndex")),
    maxIntelligence: Math.max(...numeric("intelligenceIndex")),
  };
}
