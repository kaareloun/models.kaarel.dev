export const METRICS = [
  "intelligence",
  "engineering",
  "coding",
  "agentic",
  "finance_and_accounting",
  "legal",
  "healthcare_and_medical",
  "economics",
  "strategy_and_ops",
] as const;
export type Metric = (typeof METRICS)[number];

export const METRIC_LABELS: Record<Metric, string> = {
  intelligence: "Intelligence",
  engineering: "Engineering",
  coding: "Coding",
  agentic: "Agentic",
  finance_and_accounting: "Finance",
  legal: "Legal",
  healthcare_and_medical: "Medical",
  economics: "Economics",
  strategy_and_ops: "Strategy",
};

export function emptyScores(): Scores {
  return Object.fromEntries(METRICS.map((m) => [m, null])) as Scores;
}

export function emptyVariants(): Record<Metric, string | null> {
  return Object.fromEntries(METRICS.map((m) => [m, null])) as Record<
    Metric,
    string | null
  >;
}

export interface SnapshotModel {
  id: string;
  slug: string | null;
  name: string;
  creator: string;
  cost: { input: number; output: number };
  release_date: string;
  scores: Partial<Scores>;
}

export interface Snapshot {
  fetchedAt: string;
  indexVersion: number | null;
  models: SnapshotModel[];
}

export type Scores = Record<Metric, number | null>;

export interface Model {
  id: string;
  slug: string | null;
  name: string;
  creator: string;
  cost: {
    input: number;
    output: number;
  };
  release_date: string;
  scores: Scores;
  variants: Record<Metric, string | null>;
  speed: number | null;
  hasPrice: boolean;
  providerId: string;
  openWeights?: boolean | null;
}
