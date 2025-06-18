import { z } from "zod";

export const validateRawModelData = z.object({
  modelName: z.string(),
  creator: z.string(),
  contextWindow: z.string(),
  intelligenceIndex: z.string(),
  pricePerMillionTokens: z.string(),
  outputTokensPerSecond: z.string(),
  latency: z.string(),
});
