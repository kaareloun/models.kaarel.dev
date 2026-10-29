import { fetchAAModels } from "~/openrouter/fetchModels";

const models = await fetchAAModels(process.argv.includes("--force"));
console.log(`Done: ${models.length} models`);
