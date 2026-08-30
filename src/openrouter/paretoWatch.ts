import fs from "node:fs";
import { PARETO_KNOWN_FILE } from "./constants";
import { fetchOpenRouterModels } from "./fetchModels";
import { fetchOpencodeZenFreeModels } from "./fetchZenFree";
import { buildModelList } from "./enrich";
import { getParetoIds } from "./pricing";
import { broadcastParetoNotification, processTelegramUpdates } from "./telegram";

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

  const known = readKnownParetoIds();
  writeKnownParetoIds(paretoIds);

  if (!known) return;

  const newIds = [...paretoIds].filter((id) => !known.has(id));
  if (newIds.length === 0) return;

  const ranked = [...baseModels]
    .sort((a, b) => (b.coding_index ?? 0) - (a.coding_index ?? 0))
    .map((model, i) => ({ rank: i + 1, model }));
  const newEntries = ranked.filter((e) => newIds.includes(e.model.id));
  await broadcastParetoNotification(newEntries);
  console.log(`Pareto update: notified about ${newIds.length} new frontier model(s): ${newIds.join(", ")}`);
}
