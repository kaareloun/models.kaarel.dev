import { fetchModels } from "~/utils/fetchModels";

fetchModels().then(() => {
  console.log("Done");
});
