export type RawModelData = {
  modelName: string;
  creator: string;
  contextWindow: string;
  intelligenceIndex: string;
  pricePerMillionTokens: string;
  outputTokensPerSecond: string;
  latency: string;
};

export type ModelData = {
  modelName: string;
  creator: string;
  contextWindow: string;
  intelligenceIndex: number | null;
  pricePerMillionTokensInCents: number | null;
  outputTokensPerSecond: number | null;
  latency: number | null;
};

export type ModelDataWithScore = ModelData & {
  compositeScore: number;
};

export type Weights = {
  intelligence: number;
  cost: number;
  speed: number;
  latency: number;
};
