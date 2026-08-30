import { createServerFn } from "@tanstack/react-start";
import { fetchOpenRouterModels } from "~/openrouter/fetchModels";
import { startBackgroundScheduler } from "~/openrouter/scheduler";

startBackgroundScheduler();

export const getOpenRouterModels = createServerFn().handler(async () => {
  const models = await fetchOpenRouterModels();

  return models;
});