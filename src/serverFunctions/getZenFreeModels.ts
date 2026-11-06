import { createServerFn } from "@tanstack/react-start";
import { fetchOpencodeZenFreeModels } from "~/openrouter/fetchZenFree";

export const getZenFreeModels = createServerFn().handler(async () => {
  return fetchOpencodeZenFreeModels();
});
