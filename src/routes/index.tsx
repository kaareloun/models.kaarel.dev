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
import { getLastUpdate } from "~/serverFunctions/getLastUpdate";
import { Input } from "~/components/ui/input";
import { useState } from "react";
import Slider from "~/components/ui/slider";

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

  const [filters, setFilters] = useState({
    search: "",
    price: 0,
  });

  const filterModels = (filters: { search: string; price: number }) => {
    const lowerCaseValue = filters.search.toLowerCase();

    const filtered = models.filter((model) => {
      if (filters.price) {
        if (!model.cost) return false;

        if (
          model.cost.input >= filters.price ||
          model.cost.output >= filters.price
        ) {
          return false;
        }
      }

      if (
        filters.search &&
        !model.name.toLowerCase().includes(lowerCaseValue) &&
        !model.id.toLowerCase().includes(lowerCaseValue) &&
        !model.providerId.toLowerCase().includes(lowerCaseValue) &&
        !model.providername.toLowerCase().includes(lowerCaseValue)
      ) {
        return false;
      }

      return true;
    });

    setFilteredModels(filtered);
  };

  const updateFilters = (filters: { search: string; price: number }) => {
    setFilters(filters);
    filterModels(filters);
  };

  return (
    <div className="p-2">
      <div className="flex justify-between gap-2">
        <div className="flex flex-col p-2 gap-2">
          <h1 className="text-3xl font-bold">Newest Models</h1>
          <span className="text-xs font-bold tracking-widest">
            Last update {lastUpdate}
          </span>
        </div>
        <div className="flex flex-col p-2 gap-2">
          <Input
            placeholder="Filter"
            onChange={(e) =>
              updateFilters({ ...filters, search: e.target.value })
            }
          />
          <h3 className="text-xs font-bold tracking-widest">Price</h3>
          <Slider
            min={0}
            max={5}
            value={[filters.price]}
            onChange={(value) => updateFilters({ ...filters, price: value[0] })}
            step={0.01}
          />
        </div>
      </div>
      <Table className="border-separate border-spacing-y-0">
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Input cost</TableHead>
            <TableHead>Output cost</TableHead>
            <TableHead>Release Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredModels.map((model, i) => (
            <TableRow key={i}>
              <TableCell>
                <a
                  className="hover:underline text-base font-semibold"
                  href={`https://models.dev/?sort=release-date&order=desc&search=${model.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {decodeURIComponent(model.id)}
                </a>
              </TableCell>
              <TableCell>{model.providerId}</TableCell>
              <TableCell>
                {model.cost?.input ? `$${model.cost.input}` : ""}
              </TableCell>
              <TableCell>
                {model.cost?.output ? `$${model.cost.output}` : ""}
              </TableCell>
              <TableCell>{model.release_date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
