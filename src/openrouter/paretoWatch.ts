import fs from "node:fs";
import {
  BENCHMARKED_KNOWN_FILE,
  FREE_KNOWN_FILE,
  FRONTIER_CREATORS,
  PARETO_KNOWN_FILE,
  WATCH_METRIC,
} from "./constants";
import { fetchAAModels } from "./fetchModels";
import { fetchOpencodeZenFreeModels } from "./fetchZenFree";
import { buildModelList, enrichModel, rankByMetric } from "./enrich";
import { getParetoIds, isFreeModel } from "./pricing";
import {
  broadcastCombinedNotification,
  processTelegramUpdates,
} from "./telegram";

function readKnownIds(file: string): Set<string> | null {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
    if (Array.isArray(raw?.ids)) return new Set(raw.ids as string[]);
  } catch {}
  return null;
}

function writeKnownIds(file: string, ids: Set<string>): void {
  try {
    fs.writeFileSync(file, JSON.stringify({ ids: [...ids] }, null, 2));
  } catch (error) {
    console.error(`Failed to write ${file}:`, error);
  }
}

function newIds(current: Set<string>, known: Set<string> | null): string[] {
  return known ? [...current].filter((id) => !known.has(id)) : [];
}

export async function runParetoWatchCycle(): Promise<void> {
  await processTelegramUpdates();

  const zenFree = await fetchOpencodeZenFreeModels();
  const models = await fetchAAModels();

  if (models.length === 0 && zenFree.length === 0) {
    console.warn(
      "Pareto watch cycle skipped: no data fetched and no cache available",
    );
    return;
  }

  const { baseModels } = buildModelList(models, zenFree, "top", WATCH_METRIC);
  const paretoIds = getParetoIds(baseModels);
  const freeIds = new Set(baseModels.filter(isFreeModel).map((m) => m.id));
  const benchmarkedIds = new Set(
    models
      .filter(
        (m) =>
          FRONTIER_CREATORS.includes(m.creator) &&
          m.scores[WATCH_METRIC] != null,
      )
      .map((m) => m.id),
  );

  const knownPareto = readKnownIds(PARETO_KNOWN_FILE);
  const knownFree = readKnownIds(FREE_KNOWN_FILE);
  const knownBenchmarked = readKnownIds(BENCHMARKED_KNOWN_FILE);
  writeKnownIds(PARETO_KNOWN_FILE, paretoIds);
  writeKnownIds(FREE_KNOWN_FILE, freeIds);
  writeKnownIds(BENCHMARKED_KNOWN_FILE, benchmarkedIds);

  const newParetoIds = newIds(paretoIds, knownPareto);
  const newFreeIds = newIds(freeIds, knownFree);
  const newBenchmarkedIds = newIds(benchmarkedIds, knownBenchmarked);

  if (
    newParetoIds.length === 0 &&
    newFreeIds.length === 0 &&
    newBenchmarkedIds.length === 0
  )
    return;

  const ranks = rankByMetric([...models, ...zenFree], WATCH_METRIC);
  const entriesFor = (ids: string[]) =>
    [...models, ...zenFree]
      .filter((m) => ids.includes(m.id))
      .map((m) => ({
        rank: ranks.get(m.id) ?? 0,
        model: enrichModel(m, WATCH_METRIC),
      }))
      .sort((a, b) => b.model.score - a.model.score);

  await broadcastCombinedNotification({
    benchmarkedEntries: entriesFor(newBenchmarkedIds),
    paretoEntries: entriesFor(newParetoIds),
    freeEntries: entriesFor(newFreeIds),
  });
  const parts: string[] = [];
  if (newBenchmarkedIds.length)
    parts.push(
      `${newBenchmarkedIds.length} benchmarked: ${newBenchmarkedIds.join(", ")}`,
    );
  if (newParetoIds.length)
    parts.push(`${newParetoIds.length} Pareto: ${newParetoIds.join(", ")}`);
  if (newFreeIds.length)
    parts.push(`${newFreeIds.length} free: ${newFreeIds.join(", ")}`);
  console.log(`Update: notified about ${parts.join(" | ")}`);
}
