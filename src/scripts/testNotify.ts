import fs from "node:fs";
import {
  BENCHMARKED_KNOWN_FILE,
  FREE_KNOWN_FILE,
  PARETO_KNOWN_FILE,
} from "~/openrouter/constants";
import { runParetoWatchCycle } from "~/openrouter/paretoWatch";

for (const file of [
  PARETO_KNOWN_FILE,
  FREE_KNOWN_FILE,
  BENCHMARKED_KNOWN_FILE,
]) {
  fs.writeFileSync(file, JSON.stringify({ ids: [] }, null, 2));
}
console.log(
  "Cleared known ids — announcing all current frontier, benchmarked and free models",
);

await runParetoWatchCycle();
console.log("Test cycle done");
