import fs from "node:fs";
import path from "node:path";
import { AA_HISTORY_DIR } from "./constants";
import {
  METRICS,
  type Model,
  type Scores,
  type Snapshot,
  type SnapshotModel,
} from "./model";
import { isFreeModel } from "./pricing";

function toSnapshotModel(m: Model): SnapshotModel {
  const scores: Partial<Scores> = {};
  for (const metric of METRICS) {
    const v = m.scores[metric];
    if (v != null) scores[metric] = v;
  }
  return {
    id: m.id,
    slug: m.slug,
    name: m.name,
    creator: m.creator,
    cost: m.cost,
    release_date: m.release_date,
    scores,
  };
}

function scoreFingerprint(models: SnapshotModel[]): string {
  return JSON.stringify(
    [...models]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((m) => [m.id, m.scores]),
  );
}

export function loadSnapshots(): Snapshot[] {
  try {
    return fs
      .readdirSync(AA_HISTORY_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .flatMap((f) => {
        try {
          return [
            JSON.parse(
              fs.readFileSync(path.join(AA_HISTORY_DIR, f), "utf-8"),
            ) as Snapshot,
          ];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

export function recordSnapshot(
  models: Model[],
  indexVersion: number | null,
  fetchedAt = new Date(),
): boolean {
  const scored = models
    .filter(
      (m) =>
        m.hasPrice &&
        !isFreeModel(m) &&
        METRICS.some((metric) => m.scores[metric] != null),
    )
    .map(toSnapshotModel);
  if (scored.length === 0) return false;

  const latest = loadSnapshots().at(-1);
  if (latest && scoreFingerprint(latest.models) === scoreFingerprint(scored))
    return false;

  fs.mkdirSync(AA_HISTORY_DIR, { recursive: true });
  const snapshot: Snapshot = {
    fetchedAt: fetchedAt.toISOString(),
    indexVersion,
    models: scored,
  };
  const file = path.join(
    AA_HISTORY_DIR,
    `${fetchedAt.toISOString().replace(/[:.]/g, "-")}.json`,
  );
  fs.writeFileSync(file, JSON.stringify(snapshot));
  return true;
}
