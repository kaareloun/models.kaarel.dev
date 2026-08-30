import fs from "node:fs";
import { differenceInHours } from "date-fns";
import {
  OPENROUTER_LAST_FETCH_FILE,
  OPENROUTER_MODELS_FILE,
  OPENROUTER_API_URL,
} from "./constants";
import { parseOpenRouterData, type OpenRouterModel } from "./parseData";

export async function fetchOpenRouterModels(force = false): Promise<OpenRouterModel[]> {
  if (!fs.existsSync(OPENROUTER_MODELS_FILE)) {
    fs.writeFileSync(
      OPENROUTER_MODELS_FILE,
      JSON.stringify({ data: [], total_count: 0, links: { next: null } }),
    );
  }

  if (!fs.existsSync(OPENROUTER_LAST_FETCH_FILE)) {
    fs.writeFileSync(OPENROUTER_LAST_FETCH_FILE, "2000-01-01T00:00:00.000Z");
  }

  const lastFetchDate = fs.readFileSync(OPENROUTER_LAST_FETCH_FILE, "utf-8").trim();

  if (
    !force &&
    lastFetchDate &&
    differenceInHours(new Date(), new Date(lastFetchDate)) <= 1
  ) {
    try {
      const data = JSON.parse(fs.readFileSync(OPENROUTER_MODELS_FILE, "utf-8"));
      return parseOpenRouterData(data);
    } catch {
      // Fall through to fetch on corrupted cache
    }
  }

  try {
    const response = await fetch(OPENROUTER_API_URL);
    if (!response.ok) {
      throw new Error(`OpenRouter fetch failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();

    // Validate before caching to avoid persisting error payloads
    const parsed = parseOpenRouterData(data);

    fs.writeFileSync(OPENROUTER_MODELS_FILE, JSON.stringify(data, null, 2));
    fs.writeFileSync(OPENROUTER_LAST_FETCH_FILE, new Date().toISOString());

    return parsed;
  } catch (error) {
    try {
      const data = JSON.parse(fs.readFileSync(OPENROUTER_MODELS_FILE, "utf-8"));
      return parseOpenRouterData(data);
    } catch {
      // ignore
    }

    console.error("Error fetching or parsing OpenRouter data:", error);
    return [];
  }
}