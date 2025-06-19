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
import { getLastUpdate } from "~/serverFunctions/getLastUpdate";
import { Input } from "~/components/ui/input";
import { useState } from "react";

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
  const [filteredModels, setFilteredModels] = useState(models);

  const onFilter = (value: string) => {
    const lowerCaseValue = value.toLowerCase();

    const filtered = models.filter((model) => {
      return (
        model.modelName.toLowerCase().includes(lowerCaseValue) ||
        model.creator.toLowerCase().includes(lowerCaseValue)
      );
    });

    setFilteredModels(filtered);
  };

  return (
    <div className="p-2">
      <div className="flex justify-between items-center gap-2">
        <div className="flex flex-col p-2 gap-2">
          <h1 className="text-3xl font-bold">LLM Leaderboard</h1>
          <span className="text-xs font-bold tracking-widest">
            Last update {lastUpdate}
          </span>
        </div>
        <div className="flex flex-col p-2 gap-2">
          <Input
            placeholder="Filter"
            onChange={(e) => onFilter(e.target.value)}
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
          {filteredModels.map((model) => (
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
