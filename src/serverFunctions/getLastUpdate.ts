import { createServerFn } from "@tanstack/react-start";
import { formatDistance } from "date-fns";
import fs from "fs";
import { LAST_FETCH_FILE } from "~/constants";

export const getLastUpdate = createServerFn().handler(async () => {
  const lastUpdate = new Date(fs.readFileSync(LAST_FETCH_FILE, "utf-8").trim());

  return formatDistance(new Date(lastUpdate), new Date(), {
    addSuffix: true,
  });
});
