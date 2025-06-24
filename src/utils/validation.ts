import { z } from "zod";

export const validateModelsDevResponse = z.record(
  z.string(),
  z.object({
    id: z.string(),
    name: z.string(),
    models: z.record(
      z.object({
        id: z.string(),
        name: z.string(),
        attachment: z.boolean(),
        reasoning: z.boolean(),
        release_date: z.string(),
        cost: z
          .object({
            input: z.number(),
            output: z.number(),
          })
          .optional(),
      }),
    ),
  }),
);
