import axios from "axios";
import * as cheerio from "cheerio";
import { ModelData, RawModelData } from "~/types";
import { LAST_FETCH_FILE, MODELS_FILE } from "~/constants";
import fs from "fs";
import { differenceInHours } from "date-fns";

export async function fetchModels() {
  const lastFetchDate = fs.readFileSync(LAST_FETCH_FILE, "utf-8").trim();

  if (
    lastFetchDate &&
    differenceInHours(new Date(), new Date(lastFetchDate)) <= 24
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

      const rawModelData: RawModelData = {
        modelName: data[0],
        creator: data[1].match(/alt="([^"]+)"/)?.[1] ?? "",
        contextWindow: data[2],
        intelligenceIndex: data[3],
        pricePerMillionTokens: data[4],
        outputTokensPerSecond: data[5],
        latency: data[6],
      };

      models.push({
        modelName: rawModelData.modelName,
        creator: rawModelData.creator,
        contextWindow: rawModelData.contextWindow,
        intelligenceIndex: rawModelData.intelligenceIndex
          ? parseInt(rawModelData.intelligenceIndex, 10)
          : null,
        pricePerMillionTokensInCents: rawModelData.pricePerMillionTokens
          ? parseInt(
              (
                parseFloat(
                  rawModelData.pricePerMillionTokens.replace("$", ""),
                ) * 100
              ).toFixed(0),
              10,
            )
          : null,
        outputTokensPerSecond: rawModelData.outputTokensPerSecond
          ? parseFloat(rawModelData.outputTokensPerSecond)
          : null,
        latency: rawModelData.latency ? parseFloat(rawModelData.latency) : null,
      });
    });

    fs.writeFileSync(MODELS_FILE, JSON.stringify(models, null, 2));
    fs.writeFileSync(LAST_FETCH_FILE, new Date().toISOString());

    return models;
  } catch (error) {
    try {
      return JSON.parse(fs.readFileSync(MODELS_FILE, "utf-8")) as ModelData[];
    } catch (error) {
      //
    }

    console.error("Error fetching or parsing data:", error);
    return [];
  }
}
