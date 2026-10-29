import { z } from "zod";

const nullableNumber = z.number().nullable().optional();

export const aaModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  release_date: z.string().nullable().optional(),
  model_creator: z.object({
    id: z.string(),
    name: z.string(),
  }),
  evaluations: z.record(z.number().nullable()).nullable().optional(),
  pricing: z
    .object({
      price_1m_input_tokens: nullableNumber,
      price_1m_output_tokens: nullableNumber,
    })
    .nullable()
    .optional(),
  performance: z
    .object({
      median_output_tokens_per_second: nullableNumber,
    })
    .nullable()
    .optional(),
});

export const aaPageSchema = z.object({
  intelligence_index_version: z.number().nullable().optional(),
  data: z.array(aaModelSchema),
  pagination: z.object({
    page: z.number(),
    total_pages: z.number(),
    has_more: z.boolean(),
  }),
});

export const aaModelsFileSchema = z.array(aaModelSchema);

export type AAModel = z.infer<typeof aaModelSchema>;
