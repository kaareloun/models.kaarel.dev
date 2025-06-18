import { createServerFn } from "@tanstack/react-start";
import { fetchModels } from "~/utils/fetchModels";

export const getModels = createServerFn().handler(async () => {
  const models = await fetchModels();

  return models;
});
