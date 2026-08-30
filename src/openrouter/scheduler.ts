import fs from "node:fs";
import { PARETO_CYCLE_INTERVAL_MS, PARETO_STARTUP_DELAY_MS } from "./constants";
import { runParetoWatchCycle } from "./paretoWatch";

function loadDotEnv() {
  try {
    for (const line of fs.readFileSync(".env", "utf-8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m?.[1] && m[2] !== undefined && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {}
}

export function startBackgroundScheduler(): void {
  if (typeof window !== "undefined") return;

  const g = globalThis as typeof globalThis & { __modelsSchedulerStarted?: boolean };
  if (g.__modelsSchedulerStarted) return;
  g.__modelsSchedulerStarted = true;

  loadDotEnv();

  setTimeout(() => {
    runParetoWatchCycle().catch((error) => console.error("Pareto startup cycle failed:", error));
  }, PARETO_STARTUP_DELAY_MS);

  setInterval(() => {
    runParetoWatchCycle().catch((error) => console.error("Pareto cycle failed:", error));
  }, PARETO_CYCLE_INTERVAL_MS);
}
