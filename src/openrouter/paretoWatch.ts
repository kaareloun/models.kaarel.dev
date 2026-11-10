import fs from "node:fs";
import { differenceInDays } from "date-fns";
import {
  BENCHMARKED_KNOWN_FILE,
  LAUNCH_ALERT_CREATORS,
  LAUNCH_ALERT_MAX_AGE_DAYS,
  PARETO_KNOWN_FILE,
  WATCH_METRIC,
} from "./constants";
import { fetchAAModels } from "./fetchModels";
import { fetchOpencodeZenFreeModels } from "./fetchZenFree";
import { buildModelList, enrichModel, rankByMetric } from "./enrich";
import { getParetoIds } from "./pricing";
import type { Model } from "./model";
import {
  broadcastUpdate,
  processTelegramUpdates,
  type AlertModel,
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

function isRecentRelease(m: Model): boolean {
  if (!m.release_date) return true;
  return (
    differenceInDays(new Date(), new Date(m.release_date)) <=
    LAUNCH_ALERT_MAX_AGE_DAYS
  );
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

  const baseModels = buildModelList(models, zenFree, "top", WATCH_METRIC);
  const paretoIds = getParetoIds(baseModels);
  const launchIds = new Set(
    models
      .filter(
        (m) =>
          LAUNCH_ALERT_CREATORS.includes(m.creator) &&
          m.scores[WATCH_METRIC] != null,
      )
      .map((m) => m.id),
  );

  const knownPareto = readKnownIds(PARETO_KNOWN_FILE);
  const knownLaunches = readKnownIds(BENCHMARKED_KNOWN_FILE);
  writeKnownIds(PARETO_KNOWN_FILE, paretoIds);
  writeKnownIds(BENCHMARKED_KNOWN_FILE, launchIds);

  const all = [...models, ...zenFree];
  const byId = new Map(all.map((m) => [m.id, m]));
  const launchedIds = newIds(launchIds, knownLaunches).filter((id) => {
    const m = byId.get(id);
    return m !== undefined && isRecentRelease(m);
  });
  const joinedIds = newIds(paretoIds, knownPareto);

  if (launchedIds.length === 0 && joinedIds.length === 0) return;

  const ranks = rankByMetric(all, WATCH_METRIC);
  const alertModels = (ids: string[]): AlertModel[] =>
    ids
      .flatMap((id) => {
        const m = byId.get(id);
        return m ? [m] : [];
      })
      .map((m) => ({
        rank: ranks.get(m.id) ?? 0,
        model: enrichModel(m, WATCH_METRIC),
      }))
      .sort((a, b) => b.model.score - a.model.score);

  await broadcastUpdate({
    launched: alertModels(launchedIds),
    joined: alertModels(joinedIds),
  });
  console.log(
    `Update: launched [${launchedIds.join(", ")}], frontier joined [${joinedIds.join(", ")}]`,
  );
}
