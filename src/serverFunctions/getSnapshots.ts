import { createServerFn } from "@tanstack/react-start";
import { loadSnapshots } from "~/openrouter/history";

export const getSnapshots = createServerFn().handler(async () => {
  return loadSnapshots();
});
