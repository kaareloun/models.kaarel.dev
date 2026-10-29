import fs from "node:fs";
import {
  AA_API_URL,
  AA_FETCH_INTERVAL_MS,
  AA_INDEX_VERSION_FILE,
  AA_LAST_ATTEMPT_FILE,
  AA_LAST_FETCH_FILE,
  AA_MAX_PAGES,
  AA_MODELS_FILE,
} from "./constants";
import { recordSnapshot } from "./history";
import { parseAAData } from "./parseData";
import type { Model } from "./model";
import { aaModelsFileSchema, aaPageSchema, type AAModel } from "./validation";

function readTimestamp(file: string): number {
  try {
    const t = new Date(fs.readFileSync(file, "utf-8").trim()).getTime();
    return Number.isNaN(t) ? 0 : t;
  } catch {
    return 0;
  }
}

function readCachedRaw(): AAModel[] | null {
  try {
    return aaModelsFileSchema.parse(
      JSON.parse(fs.readFileSync(AA_MODELS_FILE, "utf-8")),
    );
  } catch {
    return null;
  }
}

async function fetchAllPages(
  apiKey: string,
): Promise<{ models: AAModel[]; indexVersion: number | null }> {
  const all: AAModel[] = [];
  let indexVersion: number | null = null;
  for (let page = 1; page <= AA_MAX_PAGES; page++) {
    const response = await fetch(`${AA_API_URL}?page=${page}`, {
      headers: { "x-api-key": apiKey },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(
        `Artificial Analysis fetch failed: ${response.status} ${response.statusText}`,
      );
    }
    const parsed = aaPageSchema.parse(await response.json());
    all.push(...parsed.data);
    indexVersion ??= parsed.intelligence_index_version ?? null;
    if (!parsed.pagination.has_more) return { models: all, indexVersion };
  }
  throw new Error(
    `Artificial Analysis returned more than ${AA_MAX_PAGES} pages`,
  );
}

export async function fetchAAModels(force = false): Promise<Model[]> {
  const cached = readCachedRaw();
  const apiKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY ?? "";
  const isFresh =
    Date.now() - readTimestamp(AA_LAST_ATTEMPT_FILE) < AA_FETCH_INTERVAL_MS;

  if (!apiKey || (!force && cached && isFresh)) {
    if (!apiKey && !cached)
      console.error(
        "ARTIFICIAL_ANALYSIS_API_KEY is not set and no cache exists",
      );
    return cached ? parseAAData(cached) : [];
  }

  fs.writeFileSync(AA_LAST_ATTEMPT_FILE, new Date().toISOString());
  try {
    const { models: raw, indexVersion } = await fetchAllPages(apiKey);
    fs.writeFileSync(AA_MODELS_FILE, JSON.stringify(raw));
    fs.writeFileSync(AA_LAST_FETCH_FILE, new Date().toISOString());
    if (indexVersion != null)
      fs.writeFileSync(AA_INDEX_VERSION_FILE, String(indexVersion));
    const models = parseAAData(raw);
    recordSnapshot(models, indexVersion);
    return models;
  } catch (error) {
    console.error("Error fetching Artificial Analysis data:", error);
    return cached ? parseAAData(cached) : [];
  }
}
