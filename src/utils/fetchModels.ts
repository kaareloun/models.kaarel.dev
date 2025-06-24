import { LAST_FETCH_FILE, MODELS_FILE } from "~/constants";
import fs from "fs";
import { differenceInHours } from "date-fns";
import { parseData } from "./parseData";

export async function fetchModels() {
  if (!fs.existsSync(MODELS_FILE)) {
    fs.writeFileSync(MODELS_FILE, "{}");
  }

  if (!fs.existsSync(LAST_FETCH_FILE)) {
    fs.writeFileSync(LAST_FETCH_FILE, "2000-01-01T00:00:00.000Z");
  }

  const lastFetchDate = fs.readFileSync(LAST_FETCH_FILE, "utf-8").trim();

  if (
    lastFetchDate &&
    differenceInHours(new Date(), new Date(lastFetchDate)) <= 1
  ) {
    const data = JSON.parse(fs.readFileSync(MODELS_FILE, "utf-8"));
    return parseData(data);
  }

  try {
    const data = await fetch("https://models.dev/api.json").then((res) =>
      res.json(),
    );

    fs.writeFileSync(MODELS_FILE, JSON.stringify(data, null, 2));
    fs.writeFileSync(LAST_FETCH_FILE, new Date().toISOString());

    return parseData(data);
  } catch (error) {
    try {
      const data = JSON.parse(fs.readFileSync(MODELS_FILE, "utf-8"));
      return parseData(data);
    } catch (error) {
      //
    }

    console.error("Error fetching or parsing data:", error);
    return [];
  }
}
