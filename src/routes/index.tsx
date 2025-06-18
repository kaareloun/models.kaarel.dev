import { createFileRoute } from "@tanstack/react-router";
import { getModels } from "~/serverFunctions/getModels";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { centsToDollars } from "~/utils/price";
import { useState } from "react";
import { Slider } from "~/components/ui/slider";
import { calculateCompositeScore, computeGlobalStats } from "~/utils/calculate";
import { ModelData, Weights } from "~/types";
import { getLastUpdate } from "~/serverFunctions/getLastUpdate";

export const Route = createFileRoute("/")({
  component: Home,
  loader: async () => {
    const [models, lastUpdate] = await Promise.all([
      getModels(),
      getLastUpdate(),
    ]);

    return {
      models,
      lastUpdate,
    };
  },
});

function Home() {
  const { models, lastUpdate } = Route.useLoaderData();
  const [sortedModels, setSortedModels] =
    useState<(ModelData & { compositeScore?: number })[]>(models);
  const [weights, setWeights] = useState<Weights>({
    intelligence: 100,
    cost: 0,
    speed: 0,
    latency: 0,
  });

  const sortModels = (weights: Weights) => {
    const stats = computeGlobalStats(models);

    const modelsWithScores = models.map((model) => ({
      ...model,
      compositeScore: calculateCompositeScore(model, weights, stats),
    }));

    setSortedModels(
      modelsWithScores.sort((a, b) => b.compositeScore - a.compositeScore),
    );
  };

  const updateWeights = (key: keyof Weights, value: number) => {
    const newWeights = { ...weights, [key]: value };
    setWeights(() => newWeights);
    sortModels(newWeights);
  };

  return (
    <div>
      <div className="flex flex-col justify-between p-5 gap-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest">
            Last update {lastUpdate}
          </span>
        </div>
        <h4 className="text-2xl font-bold">Sort</h4>
        <div className="flex flex-col gap-2">
          <small className="text-xs font-bold uppercase">Intelligence</small>
          <Slider
            onValueChange={(e) => updateWeights("intelligence", e[0])}
            className="w-64"
            defaultValue={[weights.intelligence]}
            max={100}
            step={1}
          />
        </div>
        <div className="flex flex-col gap-2">
          <small className="text-xs font-bold uppercase">Cost</small>
          <Slider
            onValueChange={(e) => updateWeights("cost", e[0])}
            className="w-64"
            defaultValue={[weights.cost]}
            max={100}
            step={1}
          />
        </div>
        <div className="flex flex-col gap-2">
          <small className="text-xs font-bold uppercase">Speed</small>
          <Slider
            onValueChange={(e) => updateWeights("speed", e[0])}
            className="w-64"
            defaultValue={[weights.speed]}
            max={100}
            step={1}
          />
        </div>
        <div className="flex flex-col gap-2">
          <small className="text-xs font-bold uppercase">Latency</small>
          <Slider
            onValueChange={(e) => updateWeights("latency", e[0])}
            className="w-64"
            defaultValue={[weights.latency]}
            max={100}
            step={1}
          />
        </div>
      </div>
      <Table className="border-separate border-spacing-y-0">
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Context Window</TableHead>
            <TableHead>Intelligence Index</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Output Tokens/s</TableHead>
            <TableHead>Latency</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedModels.map((model) => (
            <TableRow key={`${model.modelName}-${model.intelligenceIndex}`}>
              <TableCell className="font-semibold text-accent-foreground">
                {model.modelName ?? "Unknown"}
              </TableCell>
              <TableCell>{model.creator ?? "Unknown"}</TableCell>
              <TableCell>{model.contextWindow ?? "Unknown"}</TableCell>
              <TableCell>{model.intelligenceIndex ?? "Unknown"}</TableCell>
              <TableCell>
                {model.pricePerMillionTokensInCents
                  ? centsToDollars(model.pricePerMillionTokensInCents)
                  : "Unknown"}
              </TableCell>
              <TableCell>{model.outputTokensPerSecond ?? "Unknown"}</TableCell>
              <TableCell>{model.latency ?? "Unknown"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
