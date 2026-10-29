import type { AAModel } from "./validation";
import { loadOpenWeightsMap, resolveOpenWeights } from "./openWeights";
import { METRICS, emptyScores, emptyVariants, type Model, type Scores } from "./model";

function splitName(name: string): { base: string; variant: string | null } {
  const m = name.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (!m?.[1]) return { base: name.trim(), variant: null };
  const variant = m[2]?.split(",")[0]?.trim() || null;
  return { base: m[1].trim(), variant };
}

function scoresOf(m: AAModel): Scores {
  const scores = emptyScores();
  for (const metric of METRICS) {
    scores[metric] = m.evaluations?.[`artificial_analysis_${metric}_index`] ?? null;
  }
  return scores;
}

export function parseAAData(raw: AAModel[]): Model[] {
  const weightsMap = loadOpenWeightsMap();
  const groups = new Map<string, AAModel[]>();
  for (const m of raw) {
    const key = `${m.model_creator.id}|${splitName(m.name).base}`;
    const group = groups.get(key);
    if (group) group.push(m);
    else groups.set(key, [m]);
  }

  const models: Model[] = [];
  for (const variants of groups.values()) {
    const priced = variants.find(
      (v) => (v.pricing?.price_1m_input_tokens ?? 0) + (v.pricing?.price_1m_output_tokens ?? 0) > 0,
    );
    const scores = emptyScores();
    const bestVariant = emptyVariants();
    for (const v of variants) {
      const s = scoresOf(v);
      for (const metric of METRICS) {
        const value = s[metric];
        const current = scores[metric];
        if (value != null && (current == null || value > current)) {
          scores[metric] = value;
          bestVariant[metric] = splitName(v.name).variant;
        }
      }
    }

    if (!priced && Object.values(scores).every((v) => v == null)) continue;

    const main = priced ?? variants[0];
    if (!main) continue;
    const slug = [...variants].map((v) => v.slug).sort((a, b) => a.length - b.length)[0] ?? main.slug;
    const base = splitName(main.name).base;
    const releaseDates = variants.map((v) => v.release_date).filter((d): d is string => !!d).sort();
    const speeds = variants
      .map((v) => v.performance?.median_output_tokens_per_second)
      .filter((s): s is number => typeof s === "number" && s > 0);

    models.push({
      id: `aa/${slug}`,
      slug,
      name: base,
      creator: main.model_creator.name,
      cost: {
        input: priced?.pricing?.price_1m_input_tokens ?? 0,
        output: priced?.pricing?.price_1m_output_tokens ?? 0,
      },
      release_date: releaseDates[0] ?? "",
      scores,
      variants: bestVariant,
      speed: speeds.length ? Math.max(...speeds) : null,
      hasPrice: !!priced,
      providerId: main.model_creator.name,
      openWeights: resolveOpenWeights([base, slug], weightsMap),
    });
  }

  return models.sort((a, b) => b.release_date.localeCompare(a.release_date));
}
