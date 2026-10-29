import fs from "node:fs";
import { OPEN_WEIGHTS_FILE } from "./constants";
import { normalizeModelKey } from "./normalize";

export function loadOpenWeightsMap(): Record<string, boolean> {
  try {
    const raw = JSON.parse(fs.readFileSync(OPEN_WEIGHTS_FILE, "utf-8"));
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Record<string, boolean>;
    }
  } catch {}
  return {};
}

export function resolveOpenWeights(
  keys: string[],
  weightsMap: Record<string, boolean>,
): boolean | null {
  for (const key of keys) {
    const v = weightsMap[normalizeModelKey(key)];
    if (typeof v === "boolean") return v;
  }
  return null;
}
