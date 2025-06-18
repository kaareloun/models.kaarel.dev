export type ModelData = {
  modelName: string;
  creator: string;
  contextWindow: string;
  intelligenceIndex: number;
  pricePerMillionTokensInCents: number;
  outputTokensPerSecond: number;
  latency: number;
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
