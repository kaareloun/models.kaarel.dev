import { createServerFn } from "@tanstack/react-start";
import { fetchAAModels } from "~/openrouter/fetchModels";
import { startBackgroundScheduler } from "~/openrouter/scheduler";

export const getModels = createServerFn().handler(async () => {
  startBackgroundScheduler();
  const models = await fetchAAModels();

  return models;
});
