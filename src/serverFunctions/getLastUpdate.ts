import { createServerFn } from "@tanstack/react-start";
import fs from "fs";
import { LAST_FETCH_FILE } from "~/constants";

export const getLastUpdate = createServerFn().handler(async () => {
  return new Date(fs.readFileSync(LAST_FETCH_FILE, "utf-8"));
});
