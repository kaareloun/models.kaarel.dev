import fs from "node:fs";
import { OPEN_WEIGHTS_FILE } from "./constants";

export function loadOpenWeightsMap(): Record<string, boolean> {
  try {
    const raw = JSON.parse(fs.readFileSync(OPEN_WEIGHTS_FILE, "utf-8"));
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Record<string, boolean>;
    }
  } catch {}
  return {};
}

function stripVariantSuffix(id: string): string {
  return id.replace(/:(batch|free)$/, "");
}

function mapLookup(map: Record<string, boolean>, id: string): boolean | null {
  const v = map[id] ?? map[stripVariantSuffix(id)];
  return typeof v === "boolean" ? v : null;
}

export function resolveOpenWeights(
  modelId: string,
  opts: { weightsMap: Record<string, boolean>; huggingFaceId?: string | null },
): boolean | null {
  if (opts.huggingFaceId != null && opts.huggingFaceId !== "") return true;
  return mapLookup(opts.weightsMap, modelId);
}

export function resolveZenOpenWeights(
  zenId: string,
  matched: { id: string; hugging_face_id: string | null } | null,
  weightsMap: Record<string, boolean>,
): boolean | null {
  if (matched) {
    if (matched.hugging_face_id != null && matched.hugging_face_id !== "") return true;
    const matchedFlag = mapLookup(weightsMap, matched.id);
    if (matchedFlag !== null) return matchedFlag;
  }
  return mapLookup(weightsMap, zenId);
}
