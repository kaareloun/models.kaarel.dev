import { z } from "zod";

export const openRouterModelSchema = z.object({
  id: z.string(),
  canonical_slug: z.string(),
  hugging_face_id: z.string().nullable(),
  name: z.string(),
  created: z.number(),
  description: z.string(),
  context_length: z.number(),
  architecture: z.object({
    modality: z.string(),
    input_modalities: z.array(z.string()),
    output_modalities: z.array(z.string()),
    tokenizer: z.string(),
    instruct_type: z.string().nullable(),
  }),
  pricing: z.object({
    prompt: z.string(),
    completion: z.string(),
    input_cache_read: z.string().optional(),
    input_cache_write: z.string().optional(),
    web_search: z.string().optional(),
  }),
  top_provider: z.object({
    context_length: z.number().nullable(),
    max_completion_tokens: z.number().nullable(),
    is_moderated: z.boolean(),
  }),
  per_request_limits: z.unknown().nullable(),
  supported_parameters: z.array(z.string()),
  default_parameters: z.record(z.unknown()),
  supported_voices: z.unknown().nullable(),
  knowledge_cutoff: z.string().nullable(),
  expiration_date: z.unknown().nullable(),
  links: z.object({
    details: z.string(),
  }),
  benchmarks: z
    .object({
      design_arena: z.array(z.unknown()).optional(),
      artificial_analysis: z
        .object({
          intelligence_index: z.number().nullable().optional(),
          coding_index: z.number().nullable().optional(),
          agentic_index: z.number().nullable().optional(),
        })
        .optional(),
    })
    .optional(),
});

export const openRouterResponseSchema = z.object({
  data: z.array(openRouterModelSchema),
  total_count: z.number(),
  links: z.object({
    next: z.string().nullable(),
  }),
});