import { createServerFn } from "@tanstack/react-start";
import { formatDistance } from "date-fns";
import fs from "node:fs";
import { AA_LAST_FETCH_FILE } from "~/openrouter/constants";

export const getLastUpdate = createServerFn().handler(async () => {
  if (!fs.existsSync(AA_LAST_FETCH_FILE)) return "never";

  const raw = fs.readFileSync(AA_LAST_FETCH_FILE, "utf-8").trim();
  const lastUpdate = new Date(raw);
  if (Number.isNaN(lastUpdate.getTime())) {
    return "unknown";
  }

  return formatDistance(lastUpdate, new Date(), {
    addSuffix: true,
  });
});
