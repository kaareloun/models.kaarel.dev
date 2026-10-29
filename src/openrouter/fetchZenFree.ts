import fs from "node:fs";
import { differenceInHours } from "date-fns";
import {
  ZEN_FREE_FILE,
  ZEN_LAST_FETCH_FILE,
  MODELS_DEV_URL,
} from "./zenConstants";
import { OPEN_WEIGHTS_FILE } from "./constants";
import { fetchAAModels } from "./fetchModels";
import { normalizeModelKey } from "./normalize";
import { loadOpenWeightsMap, resolveOpenWeights } from "./openWeights";
import { METRICS, type Model } from "./model";

type ModelsDevModel = {
  id?: string;
  name?: string;
  open_weights?: boolean;
  cost?: { input?: number; output?: number };
};
type ModelsDev = Record<string, { models?: Record<string, ModelsDevModel> }>;

function bestScore(m: Model): number {
  for (const metric of METRICS) {
    const s = m.scores[metric];
    if (s != null) return s;
  }
  return -1;
}

function hasScore(m: Model): boolean {
  return bestScore(m) >= 0;
}

function keysOf(m: Model): string[] {
  return [
    normalizeModelKey(m.name),
    ...(m.slug ? [normalizeModelKey(m.slug)] : []),
  ];
}

function isBetter(a: Model, b: Model): boolean {
  for (const metric of METRICS) {
    const sa = a.scores[metric];
    const sb = b.scores[metric];
    if (sa != null && sb != null && sa !== sb) return sa > sb;
  }
  const count = (m: Model) =>
    METRICS.filter((metric) => m.scores[metric] != null).length;
  return count(a) > count(b);
}

function pickBest(candidates: Model[]): Model | null {
  return candidates.reduce<Model | null>(
    (best, m) => (!best || isBetter(m, best) ? m : best),
    null,
  );
}

function findBenchmarkForZen(zenKeys: string[], models: Model[]): Model | null {
  const scored = models.filter(hasScore);

  const exact = scored.filter((m) =>
    keysOf(m).some((k) => zenKeys.includes(k)),
  );
  if (exact.length) return pickBest(exact);

  const prefix = scored.filter((m) =>
    keysOf(m).some((other) =>
      zenKeys.some((zen) => {
        if (other.startsWith(zen)) return /[0-9]/.test(other.slice(zen.length));
        if (zen.startsWith(other)) return zen.length > other.length;
        return false;
      }),
    ),
  );
  return pickBest(prefix);
}

function buildOpenWeightsMap(modelsDev: ModelsDev): Record<string, boolean> {
  const weights: Record<string, boolean> = {};
  for (const provider of Object.values(modelsDev)) {
    for (const [key, m] of Object.entries(provider?.models ?? {})) {
      if (typeof m?.open_weights !== "boolean") continue;
      for (const k of [key, m.id, m.name]) {
        if (typeof k === "string")
          weights[normalizeModelKey(k)] = m.open_weights;
      }
    }
  }
  return weights;
}

export async function fetchOpencodeZenFreeModels(
  force = false,
): Promise<Model[]> {
  if (!fs.existsSync(ZEN_FREE_FILE)) {
    fs.writeFileSync(ZEN_FREE_FILE, "[]");
  }
  if (!fs.existsSync(ZEN_LAST_FETCH_FILE)) {
    fs.writeFileSync(ZEN_LAST_FETCH_FILE, "2000-01-01T00:00:00.000Z");
  }

  const lastFetchRaw = fs.readFileSync(ZEN_LAST_FETCH_FILE, "utf-8").trim();
  if (
    !force &&
    lastFetchRaw &&
    differenceInHours(new Date(), new Date(lastFetchRaw)) <= 1
  ) {
    try {
      const cached = JSON.parse(fs.readFileSync(ZEN_FREE_FILE, "utf-8"));
      if (
        Array.isArray(cached) &&
        cached.length > 0 &&
        cached[0]?.scores &&
        "engineering" in cached[0].scores
      ) {
        return cached as Model[];
      }
    } catch {}
  }

  try {
    const modelsDevResponse = await fetch(MODELS_DEV_URL);
    if (!modelsDevResponse.ok)
      throw new Error(`models.dev fetch failed: ${modelsDevResponse.status}`);
    const modelsDev = (await modelsDevResponse.json()) as ModelsDev;

    const builtWeights = buildOpenWeightsMap(modelsDev);
    const weightsMap =
      Object.keys(builtWeights).length > 0
        ? builtWeights
        : loadOpenWeightsMap();
    if (Object.keys(builtWeights).length > 0) {
      fs.writeFileSync(
        OPEN_WEIGHTS_FILE,
        JSON.stringify(builtWeights, null, 2),
      );
    }

    const opencode = modelsDev.opencode?.models;
    if (!opencode) throw new Error("No opencode provider in models.dev");

    const aaModels = await fetchAAModels();
    if (aaModels.length === 0)
      throw new Error("No Artificial Analysis data for Zen benchmark lookup");

    const result: Model[] = [];
    const seen = new Set<string>();
    for (const [rawId, m] of Object.entries(opencode)) {
      if (m?.cost?.input !== 0 || m?.cost?.output !== 0) continue;
      const id = rawId.startsWith("opencode/")
        ? rawId.slice("opencode/".length)
        : rawId;
      if (seen.has(id)) continue;
      seen.add(id);

      const name = m.name ?? id;
      const zenKeys = [
        ...new Set([normalizeModelKey(id), normalizeModelKey(name)]),
      ];
      const bench = findBenchmarkForZen(zenKeys, aaModels);
      if (!bench) continue;

      result.push({
        id: `opencode/${id}`,
        slug: bench.slug,
        name,
        creator: "OpenCode Zen",
        cost: { input: 0, output: 0 },
        release_date: bench.release_date,
        scores: bench.scores,
        variants: bench.variants,
        speed: null,
        hasPrice: true,
        providerId: "opencode",
        openWeights:
          bench.openWeights ?? resolveOpenWeights([id, name], weightsMap),
      });
    }

    result.sort((a, b) => bestScore(b) - bestScore(a));

    if (result.length === 0) {
      try {
        const cached = JSON.parse(fs.readFileSync(ZEN_FREE_FILE, "utf-8"));
        if (Array.isArray(cached) && cached.length > 0) {
          throw new Error(
            "Zen fetch produced empty result, keeping cached data",
          );
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("keeping cached")) throw e;
      }
    }

    fs.writeFileSync(ZEN_FREE_FILE, JSON.stringify(result, null, 2));
    fs.writeFileSync(ZEN_LAST_FETCH_FILE, new Date().toISOString());

    return result;
  } catch (error) {
    try {
      const cached = JSON.parse(fs.readFileSync(ZEN_FREE_FILE, "utf-8"));
      if (Array.isArray(cached) && cached[0]?.scores) return cached as Model[];
    } catch {}
    console.error("Error fetching Zen free models:", error);
    return [];
  }
}
