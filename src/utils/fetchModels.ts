import axios from "axios";
import * as cheerio from "cheerio";
import { ModelData } from "~/types";
import { validateRawModelData } from "./validations";
import { z } from "zod";
import { LAST_FETCH_FILE, MODELS_FILE } from "~/constants";
import fs from "fs";

export async function fetchModels() {
  const lastFetchDate = fs.readFileSync(LAST_FETCH_FILE, "utf-8");

  if (
    fs.existsSync(LAST_FETCH_FILE) &&
    lastFetchDate &&
    new Date(lastFetchDate).getTime() > Date.now() - 24 * 60 * 60 * 1000
  ) {
    return JSON.parse(fs.readFileSync(MODELS_FILE, "utf-8")) as ModelData[];
  }

  const url = "https://artificialanalysis.ai/leaderboards/models";

  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(data);
    const models: ModelData[] = [];

    $("table tbody tr").each((_, element) => {
      const cells = $(element).find("td");
      const data = [
        $(cells[0]).text().trim(),
        $(cells[1]).html() ?? "",
        $(cells[2]).text().trim(),
        $(cells[3]).text().trim(),
        $(cells[4]).text().trim(),
        $(cells[5]).text().trim(),
        $(cells[6]).text().trim(),
      ];

      const rawModelData: z.infer<typeof validateRawModelData> = {
        modelName: data[0],
        creator: data[1].match(/alt="([^"]+)"/)?.[1] ?? "",
        contextWindow: data[2],
        intelligenceIndex: data[3],
        pricePerMillionTokens: data[4],
        outputTokensPerSecond: data[5],
        latency: data[6],
      };

      const validData = validateRawModelData.parse(rawModelData);

      // get price in cents, original is string like $0.01
      const priceInCents = validData.pricePerMillionTokens.replace("$", "");
      const priceInDollars = parseFloat(priceInCents) * 100;
      const priceInDollarsInt = (priceInDollars / 100).toFixed(0);

      models.push({
        modelName: validData.modelName,
        creator: validData.creator,
        contextWindow: validData.contextWindow,
        intelligenceIndex: parseInt(validData.intelligenceIndex, 10),
        pricePerMillionTokensInCents: parseInt(
          (
            parseFloat(validData.pricePerMillionTokens.replace("$", "")) * 100
          ).toFixed(0),
          10,
        ),
        outputTokensPerSecond: parseFloat(validData.outputTokensPerSecond),
        latency: parseFloat(validData.latency),
      });
    });

    fs.writeFileSync(MODELS_FILE, JSON.stringify(models, null, 2));
    fs.writeFileSync(LAST_FETCH_FILE, new Date().toISOString());

    return models;
  } catch (error) {
    console.error("Error fetching or parsing data:", error);
    return [];
  }
}
