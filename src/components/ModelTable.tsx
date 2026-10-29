import { EyeOff } from "lucide-react";
import { AA_MODEL_URL } from "~/openrouter/constants";
import { METRIC_LABELS, type Metric } from "~/openrouter/model";
import { isFreeModel } from "~/openrouter/pricing";
import type { Frame } from "~/lib/frames";
import { labColor } from "~/lib/labs";
import { RankDelta } from "./RankDelta";

interface ModelTableProps {
  frame: Frame;
  previous: Frame | undefined;
  metric: Metric;
  newIds: Set<string>;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onHide: (id: string) => void;
}

const TH =
  "px-3 py-3 text-left font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground";
const NUM = "px-3 py-3 text-right font-mono text-sm tabular";

export function ModelTable({
  frame,
  previous,
  metric,
  newIds,
  hoveredId,
  onHover,
  onHide,
}: ModelTableProps) {
  const showIntelligence = metric !== "intelligence";
  return (
    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <table className="w-full min-w-[720px] border-collapse">
        <caption className="sr-only">
          Top models by {METRIC_LABELS[metric]} Index, {frame.label}
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={TH}>
              #
            </th>
            <th scope="col" className={TH}>
              Model
            </th>
            <th scope="col" className={`${TH} hidden md:table-cell`}>
              Lab
            </th>
            <th scope="col" className={`${TH} text-right`}>
              {METRIC_LABELS[metric]}
            </th>
            {showIntelligence && (
              <th
                scope="col"
                className={`${TH} hidden text-right lg:table-cell`}
              >
                Intelligence
              </th>
            )}
            <th scope="col" className={`${TH} text-right`}>
              € / 1M
            </th>
            <th scope="col" className={`${TH} hidden text-right lg:table-cell`}>
              In / out $
            </th>
            <th scope="col" className={`${TH} hidden text-right md:table-cell`}>
              Tok/s
            </th>
            <th scope="col" className={`${TH} hidden text-right md:table-cell`}>
              Released
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Move
            </th>
            <th scope="col" className="w-10">
              <span className="sr-only">Hide</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {frame.list.map((model, i) => {
            const free = isFreeModel(model);
            const pareto = frame.pareto.has(model.id);
            return (
              <tr
                key={model.id}
                onMouseEnter={() => onHover(model.id)}
                onMouseLeave={() => onHover(null)}
                className={`transition-colors duration-300 ${hoveredId === model.id ? "bg-muted/70" : "hover:bg-muted/40"}`}
              >
                <td className="tabular px-3 py-3 font-mono text-sm text-muted-foreground">
                  {i + 1}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={
                        free
                          ? {
                              boxShadow:
                                "inset 0 0 0 1.5px oklch(var(--foreground))",
                            }
                          : { background: labColor(model.creator) }
                      }
                    />
                    {model.slug ? (
                      <a
                        href={`${AA_MODEL_URL}/${model.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {model.name}
                      </a>
                    ) : (
                      <span className="truncate text-sm font-medium">
                        {model.name}
                      </span>
                    )}
                    {model.variants[metric] && (
                      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                        {model.variants[metric]}
                      </span>
                    )}
                    {pareto && (
                      <span className="shrink-0 rounded-full border border-primary/50 px-1.5 font-mono text-[10px] leading-4 text-primary">
                        frontier
                      </span>
                    )}
                    {newIds.has(model.id) && (
                      <span className="shrink-0 rounded-full bg-primary px-1.5 font-mono text-[10px] font-semibold leading-4 text-primary-foreground">
                        new
                      </span>
                    )}
                    {model.openWeights === true && (
                      <span className="shrink-0 rounded-full border border-border px-1.5 font-mono text-[10px] leading-4 text-muted-foreground">
                        open
                      </span>
                    )}
                  </div>
                </td>
                <td className="hidden px-3 py-3 text-sm text-muted-foreground md:table-cell">
                  {model.creator}
                </td>
                <td className={`${NUM} font-semibold`}>
                  {model.score.toFixed(1)}
                </td>
                {showIntelligence && (
                  <td
                    className={`${NUM} hidden text-muted-foreground lg:table-cell`}
                  >
                    {model.scores.intelligence?.toFixed(1) ?? "–"}
                  </td>
                )}
                <td className={NUM}>
                  {free ? (
                    <span className="text-primary">free</span>
                  ) : (
                    model.avgPriceEur.toFixed(2)
                  )}
                </td>
                <td
                  className={`${NUM} hidden text-muted-foreground lg:table-cell`}
                >
                  {free
                    ? "–"
                    : `${model.cost.input.toFixed(2)} / ${model.cost.output.toFixed(2)}`}
                </td>
                <td
                  className={`${NUM} hidden text-muted-foreground md:table-cell`}
                >
                  {model.speed ? Math.round(model.speed) : "–"}
                </td>
                <td
                  className={`${NUM} hidden text-muted-foreground md:table-cell`}
                >
                  {model.release_date || "–"}
                </td>
                <td className="px-3 py-3 text-right">
                  <RankDelta
                    current={i + 1}
                    previous={previous?.ranks.get(model.id)}
                    hasPrevious={!!previous}
                  />
                </td>
                <td className="py-3 pr-1 text-right">
                  <button
                    type="button"
                    onClick={() => onHide(model.id)}
                    aria-label={`Hide ${model.name}`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9 md:w-9"
                  >
                    <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
