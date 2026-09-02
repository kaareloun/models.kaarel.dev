import fs from "node:fs";
import { FREE_KNOWN_FILE, PARETO_KNOWN_FILE } from "./constants";
import { fetchOpenRouterModels } from "./fetchModels";
import { fetchOpencodeZenFreeModels } from "./fetchZenFree";
import { buildModelList } from "./enrich";
import { getParetoIds, isFreeModel } from "./pricing";
import { broadcastCombinedNotification, processTelegramUpdates } from "./telegram";

function readKnownParetoIds(): Set<string> | null {
  try {
    const raw = JSON.parse(fs.readFileSync(PARETO_KNOWN_FILE, "utf-8"));
    if (Array.isArray(raw?.ids)) return new Set(raw.ids as string[]);
  } catch {}
  return null;
}

function writeKnownParetoIds(ids: Set<string>): void {
  try {
    fs.writeFileSync(PARETO_KNOWN_FILE, JSON.stringify({ ids: [...ids] }, null, 2));
  } catch (error) {
    console.error("Failed to write Pareto state:", error);
  }
}

function readKnownFreeIds(): Set<string> | null {
  try {
    const raw = JSON.parse(fs.readFileSync(FREE_KNOWN_FILE, "utf-8"));
    if (Array.isArray(raw?.ids)) return new Set(raw.ids as string[]);
  } catch {}
  return null;
}

function writeKnownFreeIds(ids: Set<string>): void {
  try {
    fs.writeFileSync(FREE_KNOWN_FILE, JSON.stringify({ ids: [...ids] }, null, 2));
  } catch (error) {
    console.error("Failed to write Free state:", error);
  }
}

export async function runParetoWatchCycle(): Promise<void> {
  await processTelegramUpdates();

  const zenFree = await fetchOpencodeZenFreeModels();
  const models = await fetchOpenRouterModels();

  if (models.length === 0 && zenFree.length === 0) {
    console.warn("Pareto watch cycle skipped: no data fetched and no cache available");
    return;
  }

  const { baseModels } = buildModelList(models, zenFree, "top");
  const paretoIds = getParetoIds(baseModels);
  const freeIds = new Set(baseModels.filter(isFreeModel).map((m) => m.id));

  const knownPareto = readKnownParetoIds();
  const knownFree = readKnownFreeIds();
  writeKnownParetoIds(paretoIds);
  writeKnownFreeIds(freeIds);

  // First run seeds state without notification (per file independently)
  const isFirstPareto = !knownPareto;
  const isFirstFree = !knownFree;
  if (isFirstPareto && isFirstFree) return;

  const ranked = [...baseModels]
    .sort((a, b) => (b.coding_index ?? 0) - (a.coding_index ?? 0))
    .map((model, i) => ({ rank: i + 1, model }));

  const newParetoIds = knownPareto ? [...paretoIds].filter((id) => !knownPareto.has(id)) : [];
  const newFreeIds = knownFree ? [...freeIds].filter((id) => !knownFree.has(id)) : [];

  if (newParetoIds.length === 0 && newFreeIds.length === 0) return;

  const paretoEntries = ranked.filter((e) => newParetoIds.includes(e.model.id));
  const freeEntries = ranked.filter((e) => newFreeIds.includes(e.model.id));

  await broadcastCombinedNotification({ paretoEntries, freeEntries });
  const parts: string[] = [];
  if (newParetoIds.length) parts.push(`${newParetoIds.length} Pareto: ${newParetoIds.join(", ")}`);
  if (newFreeIds.length) parts.push(`${newFreeIds.length} free: ${newFreeIds.join(", ")}`);
  console.log(`Update: notified about ${parts.join(" | ")}`);
}
