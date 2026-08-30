import fs from "node:fs";
import { differenceInHours } from "date-fns";
import { ZEN_FREE_FILE, ZEN_LAST_FETCH_FILE, MODELS_DEV_URL } from "./zenConstants";
import { OPENROUTER_MODELS_FILE } from "./constants";
import { openRouterResponseSchema } from "./validation";
import type { OpenRouterModel } from "./parseData";

/**
 * Normalized id for fuzzy matching. Collisions are intentional for cross-provider
 * mapping (e.g. opencode/glm-5-free → z-ai/glm-5.3) but weak heuristic:
 * - strips :free/:batch and non-alphanum, lowercases
 * - prefix logic in findBenchmarkForZenId then applies digit guard to avoid
 *   matching unrelated families (gpt-4 → gpt-4o blocked, kimi-k2 → kimi-k2-thinking blocked)
 * Limits: mimo-v2.5-pro vs mimo-v2.5 correctly distinguished (exact), hy3 vs hy3-preview
 * currently not matched (hy3-free excluded) — add explicit allowlist if needed.
 */
function normalize(s: string): string {
  const base = s.split("/").pop() ?? s;
  return base
    .toLowerCase()
    .replace(/:free$/, "")
    .replace(/-free$/, "")
    .replace(/:batch$/, "")
    .replace(/-batch$/, "")
    .replace(/[^a-z0-9]/g, "");
}

function stripDateSuffix(s: string): string {
  return s.replace(/-\d{8}$/, "");
}

function findBenchmarkForZenId(
  zenId: string,
  parsed: { data: Array<{ id: string; canonical_slug: string; created: number; benchmarks?: { artificial_analysis?: { coding_index?: number | null } } }> },
): { coding_index: number | null; release_date: string } | null {
  const normZen = normalize(zenId);

  // Stage 1: exact match on canonical_slug base or id (strict equality)
  let exactBest: { coding: number; date: string } | null = null;
  let exactScore = -1;
  for (const m of parsed.data) {
    const coding = m.benchmarks?.artificial_analysis?.coding_index;
    if (coding == null) continue;
    const normSlugBase = normalize(stripDateSuffix(m.canonical_slug));
    const normId = normalize(m.id);
    if (normSlugBase === normZen || normId === normZen) {
      if (coding > exactScore) {
        exactScore = coding;
        exactBest = { coding, date: new Date(m.created * 1000).toISOString().split("T")[0] ?? "" };
      }
    }
  }
  if (exactBest) return { coding_index: exactBest.coding, release_date: exactBest.date };

  // Stage 2: prefix match with constraints to avoid over-matching families
  // - zen prefix of model: suffix must contain digit (version/params like glm5->glm53, nemotron3ultra->550b)
  // - model prefix of zen: allow any suffix (zen qualifier like contributor, fin)
  let prefixBest: { coding: number; date: string } | null = null;
  let prefixScore = -1;
  for (const m of parsed.data) {
    const coding = m.benchmarks?.artificial_analysis?.coding_index;
    if (coding == null) continue;
    const normSlugBase = normalize(stripDateSuffix(m.canonical_slug));
    const normId = normalize(m.id);
    for (const normOther of [normSlugBase, normId]) {
      if (normOther === normZen) continue;
      if (normOther.startsWith(normZen)) {
        const suffix = normOther.slice(normZen.length);
        if (suffix && /[0-9]/.test(suffix)) {
          if (coding > prefixScore) {
            prefixScore = coding;
            prefixBest = { coding, date: new Date(m.created * 1000).toISOString().split("T")[0] ?? "" };
          }
        }
      } else if (normZen.startsWith(normOther)) {
        const suffix = normZen.slice(normOther.length);
        if (suffix) {
          if (coding > prefixScore) {
            prefixScore = coding;
            prefixBest = { coding, date: new Date(m.created * 1000).toISOString().split("T")[0] ?? "" };
          }
        }
      }
    }
  }
  if (prefixBest) return { coding_index: prefixBest.coding, release_date: prefixBest.date };
  return null;
}

export async function fetchOpencodeZenFreeModels(): Promise<OpenRouterModel[]> {
  if (!fs.existsSync(ZEN_FREE_FILE)) {
    fs.writeFileSync(ZEN_FREE_FILE, "[]");
  }
  if (!fs.existsSync(ZEN_LAST_FETCH_FILE)) {
    fs.writeFileSync(ZEN_LAST_FETCH_FILE, "2000-01-01T00:00:00.000Z");
  }

  const lastFetchRaw = fs.readFileSync(ZEN_LAST_FETCH_FILE, "utf-8").trim();
  if (lastFetchRaw && differenceInHours(new Date(), new Date(lastFetchRaw)) <= 1) {
    try {
      const cached = JSON.parse(fs.readFileSync(ZEN_FREE_FILE, "utf-8"));
      if (Array.isArray(cached) && cached.length > 0) return cached as OpenRouterModel[];
    } catch {}
  }

  try {
    const [modelsDev, openRouterRaw] = await Promise.all([
      fetch(MODELS_DEV_URL).then(async (r) => {
        if (!r.ok) throw new Error(`models.dev fetch failed: ${r.status}`);
        return r.json();
      }),
      (async () => {
        if (fs.existsSync(OPENROUTER_MODELS_FILE)) {
          try {
            const raw = JSON.parse(fs.readFileSync(OPENROUTER_MODELS_FILE, "utf-8"));
            // Validate before using cached file; fall through to network on failure
            openRouterResponseSchema.parse(raw);
            return raw;
          } catch {}
        }
        const r = await fetch("https://openrouter.ai/api/v1/models");
        if (!r.ok) throw new Error(`OpenRouter fallback fetch failed: ${r.status}`);
        return r.json();
      })(),
    ]);

    let parsedOpenRouter: ReturnType<typeof openRouterResponseSchema.parse>;
    try {
      parsedOpenRouter = openRouterResponseSchema.parse(openRouterRaw);
    } catch {
      throw new Error("Invalid OpenRouter data for Zen benchmark lookup");
    }

    const opencode = modelsDev?.opencode;
    if (!opencode?.models) throw new Error("No opencode provider in models.dev");

    const freeEntries: Array<{ id: string; name: string }> = [];
    for (const [mid, m] of Object.entries(opencode.models as Record<string, { name: string; cost?: { input?: number; output?: number } }>)) {
      const cost = (m as { cost?: { input?: number; output?: number } }).cost;
      if (cost?.input === 0 && cost?.output === 0) {
        freeEntries.push({ id: mid, name: (m as { name: string }).name });
      }
    }

    const result: OpenRouterModel[] = [];
    const seen = new Set<string>();
    for (const entry of freeEntries) {
      const rawId = entry.id;
      // Guard against double prefix if models.dev already returns opencode/...
      const normalizedId = rawId.startsWith("opencode/") ? rawId.slice("opencode/".length) : rawId;
      if (seen.has(normalizedId)) continue;
      seen.add(normalizedId);
      const bench = findBenchmarkForZenId(normalizedId, parsedOpenRouter);
      // Include only if we have a coding benchmark, otherwise chart has no Y
      if (!bench || bench.coding_index == null) continue;
      result.push({
        id: `opencode/${normalizedId}`,
        name: entry.name,
        cost: { input: 0, output: 0 },
        release_date: bench.release_date,
        coding_index: bench.coding_index,
        providerId: "opencode",
      });
    }

    result.sort((a, b) => (b.coding_index ?? 0) - (a.coding_index ?? 0));

    // Avoid overwriting good cache with empty result due to transient parse failures
    if (result.length === 0) {
      try {
        const cached = JSON.parse(fs.readFileSync(ZEN_FREE_FILE, "utf-8"));
        if (Array.isArray(cached) && cached.length > 0) {
          throw new Error("Zen fetch produced empty result, keeping cached data");
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("keeping cached")) throw e;
        // ignore parse errors, will write empty
      }
    }

    fs.writeFileSync(ZEN_FREE_FILE, JSON.stringify(result, null, 2));
    fs.writeFileSync(ZEN_LAST_FETCH_FILE, new Date().toISOString());

    return result;
  } catch (error) {
    try {
      const cached = JSON.parse(fs.readFileSync(ZEN_FREE_FILE, "utf-8"));
      if (Array.isArray(cached)) return cached as OpenRouterModel[];
    } catch {}
    console.error("Error fetching Zen free models:", error);
    return [];
  }
}
