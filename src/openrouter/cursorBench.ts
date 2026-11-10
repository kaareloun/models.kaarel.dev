import fs from "node:fs";
import { differenceInHours } from "date-fns";
import { z } from "zod";
import {
  CURSORBENCH_FETCH_INTERVAL_HOURS,
  CURSORBENCH_FILE,
  CURSORBENCH_TIMEOUT_MS,
  CURSORBENCH_URL,
} from "./constants";

const entrySchema = z.object({
  id: z.string(),
  model: z.string(),
  effort: z.string().nullable(),
  creator: z.string(),
  color: z.string(),
  featured: z.boolean(),
  score: z.number(),
  costPerTask: z.number(),
  tokensPerTask: z.number(),
  stepsPerTask: z.number(),
});

const cacheSchema = z.object({
  version: z.string(),
  fetchedAt: z.string(),
  entries: z.array(entrySchema),
});

export type CursorBenchEntry = z.infer<typeof entrySchema>;
export type CursorBench = z.infer<typeof cacheSchema>;

const EFFORT_SUFFIX = / (Max|Extra High|High|Medium|Low|Minimal)$/;

const CREATOR_PREFIXES: [RegExp, string][] = [
  [/^(Fable|Opus|Sonnet|Haiku|Claude)\b/, "Anthropic"],
  [/^(GPT|o\d)\b/, "OpenAI"],
  [/^Gemini\b/, "Google"],
  [/^Grok\b/, "SpaceXAI"],
  [/^Muse\b/, "Meta"],
  [/^DeepSeek\b/, "DeepSeek"],
  [/^GLM\b/, "Z AI"],
  [/^Kimi\b/, "Kimi"],
  [/^Qwen\b/, "Alibaba"],
  [/^Composer\b/, "Cursor"],
];

function creatorOf(model: string): string {
  return CREATOR_PREFIXES.find(([re]) => re.test(model))?.[1] ?? "Other";
}

const FALLBACK_COLOR = "oklch(var(--muted-foreground))";

function seriesStyle(cellHtml: string): { color: string; featured: boolean } {
  const style = cellHtml.match(/style="([^"]*)"/)?.[1] ?? "";
  const channels = style.match(/rgb\((.+?) \/ 1\)/)?.[1];
  if (!channels) return { color: FALLBACK_COLOR, featured: false };
  const withFallback = channels.replace(
    /var\((--[\w-]+)\)/,
    "var($1, 140 140 140)",
  );
  return {
    color: `rgb(${withFallback})`,
    featured: style.startsWith("background-color"),
  };
}

function cellText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function toNumber(text: string): number {
  return Number(text.replace(/[$,%]/g, ""));
}

export function parseCursorBench(html: string): CursorBench {
  const version =
    html.match(/<h1[^>]*>\s*CursorBench\s+([\d.]+)\s*<\/h1>/)?.[1] ?? "";
  const table = html.match(/<table[\s\S]*?<\/table>/)?.[0] ?? "";
  const body = table.match(/<tbody[\s\S]*?<\/tbody>/)?.[0] ?? "";

  const entries = body.split("</tr>").flatMap((row) => {
    const rawCells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(
      (m) => m[1] ?? "",
    );
    const cells = rawCells.map(cellText);
    if (cells.length < 6) return [];
    const [, name = "", score, cost, tokens, steps] = cells;
    const effort = name.match(EFFORT_SUFFIX)?.[1] ?? null;
    const model = effort ? name.slice(0, -effort.length - 1) : name;
    return [
      {
        id: name,
        model,
        effort,
        creator: creatorOf(model),
        ...seriesStyle(rawCells[1] ?? ""),
        score: toNumber(score ?? ""),
        costPerTask: toNumber(cost ?? ""),
        tokensPerTask: toNumber(tokens ?? ""),
        stepsPerTask: toNumber(steps ?? ""),
      },
    ];
  });

  return cacheSchema.parse({
    version,
    fetchedAt: new Date().toISOString(),
    entries: entries.filter(
      (e) => Number.isFinite(e.score) && Number.isFinite(e.costPerTask),
    ),
  });
}

function readCache(): CursorBench | null {
  try {
    return cacheSchema.parse(
      JSON.parse(fs.readFileSync(CURSORBENCH_FILE, "utf-8")),
    );
  } catch {
    return null;
  }
}

export async function fetchCursorBench(
  force = false,
): Promise<CursorBench | null> {
  const cached = readCache();
  if (
    !force &&
    cached &&
    differenceInHours(new Date(), new Date(cached.fetchedAt)) <
      CURSORBENCH_FETCH_INTERVAL_HOURS
  )
    return cached;

  try {
    const response = await fetch(CURSORBENCH_URL, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; models.kaarel.dev)" },
      signal: AbortSignal.timeout(CURSORBENCH_TIMEOUT_MS),
    });
    if (!response.ok)
      throw new Error(`CursorBench fetch failed: ${response.status}`);
    const parsed = parseCursorBench(await response.text());
    if (parsed.entries.length === 0)
      throw new Error("CursorBench page had no leaderboard rows");
    fs.writeFileSync(CURSORBENCH_FILE, JSON.stringify(parsed, null, 2));
    return parsed;
  } catch (error) {
    console.error("Error fetching CursorBench:", error);
    return cached;
  }
}
