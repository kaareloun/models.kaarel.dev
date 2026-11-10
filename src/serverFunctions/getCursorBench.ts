import { createServerFn } from "@tanstack/react-start";
import { fetchCursorBench } from "~/openrouter/cursorBench";

export const getCursorBench = createServerFn().handler(async () => {
  return fetchCursorBench();
});
