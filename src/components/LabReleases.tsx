import { useMemo } from "react";
import { AA_MODEL_URL, FRONTIER_CREATORS } from "~/openrouter/constants";
import { rankByMetric } from "~/openrouter/enrich";
import { METRIC_LABELS, type Metric, type Model } from "~/openrouter/model";
import { labColor } from "~/lib/labs";

interface LabReleasesProps {
  models: Model[];
  metric: Metric;
}

const COUNT = 6;

export function LabReleases({ models, metric }: LabReleasesProps) {
  const ranks = useMemo(() => rankByMetric(models, metric), [models, metric]);
  const recent = useMemo(
    () =>
      models
        .filter((m) => m.hasPrice && FRONTIER_CREATORS.includes(m.creator))
        .sort((a, b) => b.release_date.localeCompare(a.release_date))
        .slice(0, COUNT),
    [models],
  );

  if (recent.length === 0) return null;

  return (
    <section aria-labelledby="releases-title">
      <h2 id="releases-title" className="text-sm font-semibold">
        Latest frontier lab releases
      </h2>
      <ol className="-mx-4 mt-2 flex snap-x overflow-x-auto border-y border-border px-4 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-6 md:overflow-visible md:px-0">
        {recent.map((m) => {
          const score = m.scores[metric];
          const rank = ranks.get(m.id);
          return (
            <li
              key={m.id}
              className="w-[62%] shrink-0 snap-start border-r border-border last:border-r-0 sm:w-[38%] md:w-auto"
            >
              <a
                href={`${AA_MODEL_URL}/${m.slug}`}
                target="_blank"
                rel="noreferrer"
                className="group block h-full px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-5"
              >
                <div className="tabular flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: labColor(m.creator) }}
                  />
                  {m.creator} · {m.release_date.slice(5)}
                </div>
                <div className="mt-1 truncate text-sm font-medium underline-offset-4 group-hover:underline">
                  {m.name}
                </div>
                <div className="tabular mt-0.5 text-xs">
                  {score != null ? (
                    <>
                      <span className="font-semibold">{score.toFixed(1)}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        {METRIC_LABELS[metric]}
                        {rank ? ` · #${rank}` : ""}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      awaiting {METRIC_LABELS[metric].toLowerCase()} score
                    </span>
                  )}
                </div>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
