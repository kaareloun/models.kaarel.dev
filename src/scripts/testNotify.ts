import fs from "node:fs";
import { PARETO_KNOWN_FILE } from "~/openrouter/constants";
import { runParetoWatchCycle } from "~/openrouter/paretoWatch";

fs.writeFileSync(PARETO_KNOWN_FILE, JSON.stringify({ ids: [] }, null, 2));
console.log("Cleared known Pareto ids — announcing all current frontier models");

await runParetoWatchCycle();
console.log("Test cycle done");
