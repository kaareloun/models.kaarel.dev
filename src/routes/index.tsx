import { createFileRoute } from "@tanstack/react-router";
import { getOpenRouterModels } from "~/serverFunctions/getOpenRouterModels";
import { getOpenRouterLastUpdate } from "~/serverFunctions/getOpenRouterLastUpdate";
import { getZenFreeModels } from "~/serverFunctions/getZenFreeModels";
import { getTelegramBot } from "~/serverFunctions/getTelegramBot";
import { PricePerformanceChart } from "~/components/PricePerformanceChart";
import { buildModelList, type EnrichedModel } from "~/openrouter/enrich";
import type { OpenRouterModel } from "~/openrouter/parseData";
import { useState, useMemo } from "react";
import { Button } from "~/components/ui/button";
import { getParetoIds, isFreeModel } from "~/openrouter/pricing";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

export const Route = createFileRoute("/")({
  component: Stats,
  loader: async (): Promise<{
    models: OpenRouterModel[];
    zenFree: OpenRouterModel[];
    lastUpdate: string;
    botUsername: string | null;
  }> => {
    const [modelsRes, zenFreeRes, lastUpdateRes, botRes] = await Promise.allSettled([
      getOpenRouterModels(),
      getZenFreeModels(),
      getOpenRouterLastUpdate(),
      getTelegramBot(),
    ]);

    return {
      models: modelsRes.status === "fulfilled" ? modelsRes.value : [],
      zenFree: zenFreeRes.status === "fulfilled" ? zenFreeRes.value : [],
      lastUpdate: lastUpdateRes.status === "fulfilled" ? lastUpdateRes.value : "unknown",
      botUsername: botRes.status === "fulfilled" ? botRes.value : null,
    };
  },
});

function Stats() {
  const { models, zenFree, lastUpdate, botUsername } = Route.useLoaderData();
  const [view, setView] = useState<"top" | "all">("top");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const { baseModels: allModels, totalCount, freeCount } = useMemo(
    () => buildModelList(models, zenFree, view),
    [models, zenFree, view],
  );

  const baseModels: EnrichedModel[] = useMemo(
    () => (hiddenIds.size === 0 ? allModels : allModels.filter((m) => !hiddenIds.has(m.id))),
    [allModels, hiddenIds],
  );

  const newIds = useMemo(() => {
    const cutoff = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return new Set(baseModels.filter((m) => m.release_date >= cutoff).map((m) => m.id));
  }, [baseModels]);

  const enriched = baseModels;

  const paretoIds = useMemo(() => getParetoIds(enriched), [enriched]);

  const sortedModels = useMemo(() => {
    const copy = [...enriched];
    copy.sort((a, b) => (b.coding_index ?? 0) - (a.coding_index ?? 0));
    return copy;
  }, [enriched]);

  const isAll = view === "all";

  return (
    <div className="p-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold">OpenRouter & Opencode — Price vs Coding</h1>
          <span className="text-sm font-medium text-muted-foreground">
            Compare top coding models by price. Top 20 OpenRouter + Opencode Zen free tier. Last update {lastUpdate}
          </span>
        </div>
        <div className="text-sm text-muted-foreground text-left sm:text-right">
          {isAll
            ? `Top 20 + Free within 15pts (${freeCount} free • ${totalCount} total${hiddenIds.size ? ` • ${baseModels.length} visible` : ""})`
            : `Top 20 + Free in top 20 (${freeCount} free • ${totalCount} total${hiddenIds.size ? ` • ${baseModels.length} visible` : ""})`}
        </div>
      </div>

      <div className="mb-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500/25 border border-green-600" /> Best value
          </span>
          <span className="h-3 w-px bg-border hidden sm:block" />
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <span className="inline-block rounded bg-green-600 px-1 text-[10px] font-bold leading-4 text-white">
              NEW
            </span>
            New models
          </span>
          <span className="h-3 w-px bg-border hidden sm:block" />
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#3b82f6] border border-[#2563eb]" /> Models
          </span>
          <span className="h-3 w-px bg-border hidden sm:block" />
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <span className="inline-block rounded bg-emerald-600 px-1 text-[10px] font-bold leading-4 text-white">
              OPEN
            </span>
            Open weights
          </span>
          <span className="h-3 w-px bg-border hidden sm:block" />
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 border border-amber-600" /> Pareto frontier
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden">
            <Button
              variant={view === "top" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-7 px-3 text-xs"
              onClick={() => setView("top")}
            >
              Top
            </Button>
            <Button
              variant={view === "all" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-7 px-3 text-xs"
              onClick={() => setView("all")}
            >
              All
            </Button>
          </div>
          {hiddenIds.size > 0 && (
            <Button variant="outline" size="sm" className="h-7 px-3 text-xs" onClick={() => setHiddenIds(new Set())}>
              Show all ({hiddenIds.size} hidden)
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 sm:mb-10">
        <PricePerformanceChart models={baseModels} newIds={newIds} hoveredId={hoveredId} onHover={setHoveredId} />
      </div>

      <Table className="border-separate border-spacing-y-0">
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Model</TableHead>
            <TableHead className="hidden md:table-cell">Provider</TableHead>
            <TableHead className="hidden md:table-cell">Input ($/1M)</TableHead>
            <TableHead className="hidden md:table-cell">Output ($/1M)</TableHead>
            <TableHead>Avg (€/1M)</TableHead>
            <TableHead>Coding</TableHead>
            <TableHead className="hidden lg:table-cell">Release</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedModels.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                No models available. Data may be loading or temporarily unavailable.
              </TableCell>
            </TableRow>
          ) : (
            sortedModels.map((model, i) => {
            const isBestValue = model.avgPriceEur < 1;
            const isPareto = paretoIds.has(model.id);
            const isFree = isFreeModel(model);
            const isHovered = hoveredId === model.id;
            return (
              <TableRow
                key={model.id}
                onMouseEnter={() => setHoveredId(model.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`${isHovered ? "bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-300 dark:ring-blue-700" : isPareto ? "bg-amber-50/70 dark:bg-amber-950/20" : isBestValue ? "bg-green-50/50 dark:bg-green-950/20" : ""} cursor-pointer transition-colors`}
              >
                <TableCell className="font-bold">{i + 1}</TableCell>
                <TableCell>
                  {isFree ? (
                    <span className="text-sm sm:text-base font-semibold">{model.name}</span>
                  ) : (
                    <a
                      className="hover:underline text-sm sm:text-base font-semibold"
                      href={`https://openrouter.ai/${model.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {model.name}
                    </a>
                  )}
                  {newIds.has(model.id) && (
                    <span className="ml-1.5 inline-block rounded bg-green-600 px-1 py-px text-[10px] font-bold leading-none text-white align-middle">
                      NEW
                    </span>
                  )}
                  {model.openWeights === true && (
                    <span className="ml-1.5 inline-block rounded bg-emerald-600 px-1 py-px text-[10px] font-bold leading-none text-white align-middle">
                      OPEN
                    </span>
                  )}
                  {isPareto && <span className="ml-1 text-amber-600">◆</span>}
                </TableCell>
                <TableCell className="hidden md:table-cell">{model.providerId}</TableCell>
                <TableCell className="hidden md:table-cell">${(model.cost.input * 1_000_000).toFixed(2)}</TableCell>
                <TableCell className="hidden md:table-cell">${(model.cost.output * 1_000_000).toFixed(2)}</TableCell>
                <TableCell className={`font-medium ${isBestValue ? "text-green-700 dark:text-green-400 font-bold" : ""}`}>
                  {isFree ? "Free ★" : `${model.avgPriceEur.toFixed(2)}€${isBestValue ? " ★" : ""}`}
                </TableCell>
                <TableCell className="font-bold text-blue-600">
                  {model.coding_index?.toFixed(1) ?? "N/A"}
                </TableCell>
                <TableCell className="hidden lg:table-cell">{model.release_date}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setHiddenIds((prev) => {
                        const next = new Set(prev);
                        next.add(model.id);
                        return next;
                      });
                      if (hoveredId === model.id) setHoveredId(null);
                    }}
                  >
                    Hide
                  </Button>
                </TableCell>
              </TableRow>
            );
          })
          )}
        </TableBody>
      </Table>
      <div className="mt-6 text-xs text-muted-foreground text-center">
        ★ Best value ◆ Pareto frontier · OPEN = open weights (via models.dev) · NEW = released in last 20 days · Data via OpenRouter &amp; models.dev
        {botUsername && (
          <>
            {" · "}
            <a
              className="underline hover:text-foreground"
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noreferrer"
            >
              @{botUsername}
            </a>{" "}
            on Telegram to get notified about new Pareto frontier models
          </>
        )}
      </div>
    </div>
  );
}
