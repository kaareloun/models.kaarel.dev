import { createServerFn } from "@tanstack/react-start";
import { fetchOpenRouterModels } from "~/openrouter/fetchModels";

export const getOpenRouterModels = createServerFn().handler(async () => {
  const models = await fetchOpenRouterModels();

  return models;
});