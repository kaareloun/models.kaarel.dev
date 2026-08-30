import { createFileRoute } from "@tanstack/react-router";
import { getOpenRouterModels } from "~/serverFunctions/getOpenRouterModels";
import { getOpenRouterLastUpdate } from "~/serverFunctions/getOpenRouterLastUpdate";
import { getZenFreeModels } from "~/serverFunctions/getZenFreeModels";
import { PricePerformanceChart } from "~/components/PricePerformanceChart";
import type { OpenRouterModel } from "~/openrouter/parseData";
import { useState, useMemo } from "react";
import { Button } from "~/components/ui/button";
import { getAvgPriceEur, getParetoIds, isFreeModel } from "~/openrouter/pricing";
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
  }> => {
    const [modelsRes, zenFreeRes, lastUpdateRes] = await Promise.allSettled([
      getOpenRouterModels(),
      getZenFreeModels(),
      getOpenRouterLastUpdate(),
    ]);

    return {
      models: modelsRes.status === "fulfilled" ? modelsRes.value : [],
      zenFree: zenFreeRes.status === "fulfilled" ? zenFreeRes.value : [],
      lastUpdate: lastUpdateRes.status === "fulfilled" ? lastUpdateRes.value : "unknown",
    };
  },
});

function Stats() {
  const { models, zenFree, lastUpdate } = Route.useLoaderData();
  const [view, setView] = useState<"top" | "all">("top");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const { baseModels, totalCount, freeCount } = useMemo(() => {
    const codingValues = models.map((m) => m.coding_index).filter((v): v is number => v != null);
    const minTop20 = codingValues.length ? Math.min(...codingValues) : 0;
    const threshold = view === "all" ? minTop20 - 15 : minTop20;
    const filteredFree = [...zenFree]
      .filter((m) => m.providerId === "opencode" && (m.coding_index ?? 0) >= threshold)
      .sort((a, b) => (b.coding_index ?? 0) - (a.coding_index ?? 0));
    const combined = [...models, ...filteredFree];
    // Dedup guards future opencode/openrouter id collisions; currently disjoint (opencode/* vs provider/model) but kept for safety
    const seen = new Set<string>();
    const deduped = combined.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    const totalBeforeHidden = deduped.length;
    const freeBeforeHidden = deduped.filter((m) => m.providerId === "opencode").length;
    const finalModels = hiddenIds.size === 0 ? deduped : deduped.filter((m) => !hiddenIds.has(m.id));
    return { baseModels: finalModels, totalCount: totalBeforeHidden, freeCount: freeBeforeHidden };
  }, [models, zenFree, view, hiddenIds]);

  const newIds = useMemo(() => {
    const cutoff = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return new Set(baseModels.filter((m) => m.release_date >= cutoff).map((m) => m.id));
  }, [baseModels]);

  const enriched = useMemo(
    () =>
      baseModels.map((m) => {
        const avgPriceEur = getAvgPriceEur(m);
        const value =
          avgPriceEur > 0 && m.coding_index ? m.coding_index / avgPriceEur : m.coding_index ? 999 + m.coding_index : 0;
        return { ...m, avgPriceEur, value };
      }),
    [baseModels],
  );

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
          <h1 className="text-3xl font-bold">OpenRouter & Opencode — Price vs Coding</h1>
          <span className="text-sm font-medium text-muted-foreground">
            Compare top coding models by price. Top 20 OpenRouter + Opencode Zen free tier. Last update {lastUpdate}
          </span>
        </div>
        <div className="text-sm text-muted-foreground text-right">
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

      <div className="mb-10">
        <PricePerformanceChart models={baseModels} newIds={newIds} hoveredId={hoveredId} onHover={setHoveredId} />
      </div>

      <Table className="border-separate border-spacing-y-0">
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Input ($/1M)</TableHead>
            <TableHead>Output ($/1M)</TableHead>
            <TableHead>Avg (€/1M)</TableHead>
            <TableHead>Coding</TableHead>
            <TableHead>Release</TableHead>
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
                    <span className="text-base font-semibold">{model.name}</span>
                  ) : (
                    <a
                      className="hover:underline text-base font-semibold"
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
                  {isPareto && <span className="ml-1 text-amber-600">◆</span>}
                </TableCell>
                <TableCell>{model.providerId}</TableCell>
                <TableCell>${(model.cost.input * 1_000_000).toFixed(2)}</TableCell>
                <TableCell>${(model.cost.output * 1_000_000).toFixed(2)}</TableCell>
                <TableCell className={`font-medium ${isBestValue ? "text-green-700 dark:text-green-400 font-bold" : ""}`}>
                  {isFree ? "Free ★" : `${model.avgPriceEur.toFixed(2)}€${isBestValue ? " ★" : ""}`}
                </TableCell>
                <TableCell className="font-bold text-blue-600">
                  {model.coding_index?.toFixed(1) ?? "N/A"}
                </TableCell>
                <TableCell>{model.release_date}</TableCell>
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
        ★ Best value ◆ Pareto frontier · NEW = released in last 20 days · Data via OpenRouter &amp; models.dev
      </div>
    </div>
  );
}
