import { openRouterResponseSchema } from "./validation";

export interface OpenRouterModel {
  id: string;
  name: string;
  cost: {
    input: number;
    output: number;
  };
  release_date: string;
  coding_index: number | null;
  providerId: string;
}

export function parseOpenRouterData(data: unknown): OpenRouterModel[] {
  const parsedData = openRouterResponseSchema.parse(data);

  const sorted = parsedData.data
    .filter(
      (model) =>
        model.benchmarks?.artificial_analysis?.coding_index !== null &&
        model.benchmarks?.artificial_analysis?.coding_index !== undefined,
    )
    .map((model) => ({
      id: model.id,
      name: model.name,
      canonical_slug: model.canonical_slug,
      cost: {
        input: Number.parseFloat(model.pricing.prompt),
        output: Number.parseFloat(model.pricing.completion),
      },
      release_date: new Date(model.created * 1000).toISOString().split("T")[0] ?? "",
      coding_index: model.benchmarks?.artificial_analysis?.coding_index ?? null,
      providerId: model.id.split("/")[0] ?? "",
    }))
    .sort((a, b) => (b.coding_index ?? 0) - (a.coding_index ?? 0));

  // Dedupe by canonical_slug so :batch variants don't occupy half the top 20
  const bySlug = new Map<string, (typeof sorted)[number]>();
  for (const m of sorted) {
    const existing = bySlug.get(m.canonical_slug);
    if (!existing) {
      bySlug.set(m.canonical_slug, m);
    } else {
      // Prefer non-batch variant when scores equal (batch is cheaper but same benchmark)
      const existingIsBatch = existing.id.endsWith(":batch");
      const currentIsBatch = m.id.endsWith(":batch");
      if (existingIsBatch && !currentIsBatch) {
        bySlug.set(m.canonical_slug, m);
      }
    }
  }
  // Re-sort deduped by coding_index to restore order after map insertion (Map keeps first insertion order)
  const deduped = Array.from(bySlug.values())
    .sort((a, b) => (b.coding_index ?? 0) - (a.coding_index ?? 0))
    .slice(0, 20)
    .map(({ canonical_slug: _cs, ...rest }) => rest as OpenRouterModel);
  return deduped;
}

