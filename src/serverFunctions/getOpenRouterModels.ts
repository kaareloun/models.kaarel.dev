import { createServerFn } from "@tanstack/react-start";
import { fetchOpenRouterModels } from "~/openrouter/fetchModels";
import { startBackgroundScheduler } from "~/openrouter/scheduler";

export const getOpenRouterModels = createServerFn().handler(async () => {
  startBackgroundScheduler();
  const models = await fetchOpenRouterModels();

  return models;
});