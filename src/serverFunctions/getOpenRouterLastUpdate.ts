import { createServerFn } from "@tanstack/react-start";
import { formatDistance } from "date-fns";
import fs from "node:fs";
import { OPENROUTER_LAST_FETCH_FILE } from "~/openrouter/constants";

export const getOpenRouterLastUpdate = createServerFn().handler(async () => {
  if (!fs.existsSync(OPENROUTER_LAST_FETCH_FILE)) {
    fs.writeFileSync(OPENROUTER_LAST_FETCH_FILE, "2000-01-01T00:00:00.000Z");
  }

  const raw = fs.readFileSync(OPENROUTER_LAST_FETCH_FILE, "utf-8").trim();
  const lastUpdate = new Date(raw);
  if (Number.isNaN(lastUpdate.getTime())) {
    return "unknown";
  }

  return formatDistance(lastUpdate, new Date(), {
    addSuffix: true,
  });
});