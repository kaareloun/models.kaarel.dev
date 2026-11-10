import { fetchCursorBench } from "~/openrouter/cursorBench";

const result = await fetchCursorBench(true);
console.log(
  result
    ? `CursorBench ${result.version}: ${result.entries.length} rows`
    : "No CursorBench data",
);
