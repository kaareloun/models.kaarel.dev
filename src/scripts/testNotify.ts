import fs from "node:fs";
import { FREE_KNOWN_FILE, PARETO_KNOWN_FILE } from "~/openrouter/constants";
import { runParetoWatchCycle } from "~/openrouter/paretoWatch";

fs.writeFileSync(PARETO_KNOWN_FILE, JSON.stringify({ ids: [] }, null, 2));
fs.writeFileSync(FREE_KNOWN_FILE, JSON.stringify({ ids: [] }, null, 2));
console.log("Cleared known Pareto + free ids — announcing all current frontier and free models");

await runParetoWatchCycle();
console.log("Test cycle done");
