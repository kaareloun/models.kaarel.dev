import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getModels } from "~/serverFunctions/getModels";
import { getLastUpdate } from "~/serverFunctions/getLastUpdate";
import { getZenFreeModels } from "~/serverFunctions/getZenFreeModels";
import { getTelegramBot } from "~/serverFunctions/getTelegramBot";
import { getSnapshots } from "~/serverFunctions/getSnapshots";
import { METRIC_LABELS, type Metric, type Model, type Snapshot } from "~/openrouter/model";
import type { ModelView } from "~/openrouter/enrich";
import { isFreeModel } from "~/openrouter/pricing";
import {
  availableMetrics,
  diffFrames,
  frameDomain,
  releaseFrames,
  snapshotFrames,
  type FrameMode,
} from "~/lib/frames";
import { ChangeSummary } from "~/components/ChangeSummary";
import { ChartLegend } from "~/components/ChartLegend";
import { FrontierChart } from "~/components/FrontierChart";
import { HeroLeader } from "~/components/HeroLeader";
import { LabReleases } from "~/components/LabReleases";
import { Leaderboard } from "~/components/Leaderboard";
import { LiveDot } from "~/components/LiveDot";
import { ModelTable } from "~/components/ModelTable";
import { SegmentedControl } from "~/components/SegmentedControl";
import { SiteFooter } from "~/components/SiteFooter";
import { TimelineControl } from "~/components/TimelineControl";

export const Route = createFileRoute("/")({
  component: Stats,
  loader: async (): Promise<{
    models: Model[];
    zenFree: Model[];
    snapshots: Snapshot[];
    lastUpdate: string;
    botUsername: string | null;
  }> => {
    const [modelsRes, zenFreeRes, snapshotsRes, lastUpdateRes, botRes] = await Promise.allSettled([
      getModels(),
      getZenFreeModels(),
      getSnapshots(),
      getLastUpdate(),
      getTelegramBot(),
    ]);

    return {
      models: modelsRes.status === "fulfilled" ? modelsRes.value : [],
      zenFree: zenFreeRes.status === "fulfilled" ? zenFreeRes.value : [],
      snapshots: snapshotsRes.status === "fulfilled" ? snapshotsRes.value : [],
      lastUpdate: lastUpdateRes.status === "fulfilled" ? lastUpdateRes.value : "unknown",
      botUsername: botRes.status === "fulfilled" ? botRes.value : null,
    };
  },
});

const VIEWS = [
  { value: "top", label: "Top 20" },
  { value: "all", label: "+ free within 15 pts" },
] as const;

const NEW_WINDOW_DAYS = 21;
const PLAY_STEP_MS = 1300;

function Stats() {
  const { models, zenFree, snapshots, lastUpdate, botUsername } = Route.useLoaderData();
  const metrics = useMemo(() => availableMetrics(models), [models]);
  const [metric, setMetric] = useState<Metric>(metrics[0] ?? "intelligence");
  const [view, setView] = useState<ModelView>("top");
  const [mode, setMode] = useState<FrameMode>(snapshots.length >= 2 ? "snapshots" : "releases");
  const [index, setIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const visibleModels = useMemo(() => models.filter((m) => !hiddenIds.has(m.id)), [models, hiddenIds]);
  const visibleZen = useMemo(() => zenFree.filter((m) => !hiddenIds.has(m.id)), [zenFree, hiddenIds]);

  const frames = useMemo(
    () =>
      mode === "snapshots"
        ? snapshotFrames(snapshots, visibleModels, visibleZen, view, metric)
        : releaseFrames(visibleModels, visibleZen, view, metric),
    [mode, snapshots, visibleModels, visibleZen, view, metric],
  );
  const last = Math.max(0, frames.length - 1);
  const current = Math.min(index ?? last, last);
  const frame = frames[current];
  const previous = current > 0 ? frames[current - 1] : undefined;
  const domain = useMemo(() => frameDomain(frames), [frames]);
  const diff = useMemo(() => (frame ? diffFrames(frame, previous) : null), [frame, previous]);
  const showFreeBand = useMemo(() => frames.some((f) => f.list.some(isFreeModel)), [frames]);
  const indexVersion = snapshots.at(-1)?.indexVersion;

  const newIds = useMemo(() => {
    if (!frame) return new Set<string>();
    const end = new Date(`${frame.date.slice(0, 10)}T00:00:00Z`).getTime();
    const cutoff = new Date(end - NEW_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
    return new Set(frame.list.filter((m) => m.release_date >= cutoff).map((m) => m.id));
  }, [frame]);

  useEffect(() => {
    setIndex(null);
    setPlaying(false);
  }, [mode, metric, view]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setIndex((i) => Math.min((i ?? last) + 1, last)), PLAY_STEP_MS);
    return () => clearInterval(timer);
  }, [playing, last]);

  useEffect(() => {
    if (playing && current >= last) setPlaying(false);
  }, [playing, current, last]);

  const togglePlay = () => {
    if (playing) return setPlaying(false);
    if (current >= last) setIndex(0);
    setPlaying(true);
  };

  const metricOptions = metrics.map((m) => ({ value: m, label: METRIC_LABELS[m] }));

  return (
    <div className="relative isolate overflow-x-clip">
      <div aria-hidden="true" className="grain pointer-events-none fixed inset-0 -z-10 opacity-[0.035] mix-blend-overlay" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-56 -z-10 h-[640px] w-[900px] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(closest-side, oklch(var(--primary) / 0.14), transparent)" }}
      />

      <main className="mx-auto max-w-[1400px] px-4 pb-16 md:px-10">
        <header className="grid gap-10 pb-10 pt-10 md:pt-16 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <div className="animate-rise flex items-center gap-2.5 font-mono text-xs text-muted-foreground" style={{ "--i": 0 } as React.CSSProperties}>
              <LiveDot />
              <span>
                models.kaarel.dev · Artificial Analysis{indexVersion ? ` Index v${indexVersion}` : ""} · updated {lastUpdate}
              </span>
            </div>
            <h1
              className="animate-rise mt-6 text-5xl font-semibold leading-[0.92] tracking-tighter md:text-7xl"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              The frontier,
              <br />
              <span className="text-muted-foreground">priced.</span>
            </h1>
            <p
              className="animate-rise mt-6 max-w-[56ch] text-base leading-relaxed text-muted-foreground"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              The top 20 models on the Artificial Analysis {METRIC_LABELS[metric]} Index, plotted against what a million
              tokens costs. Free Opencode Zen models get their own lane. Drag the timeline to see how the ranking moved.
            </p>
          </div>
          <div className="lg:col-span-5 lg:justify-self-end">
            <HeroLeader leader={frame?.list[0]} runnerUp={frame?.list[1]} metric={metric} frameLabel={frame?.label ?? ""} />
          </div>
        </header>

        <LabReleases models={models} metric={metric} />

        {models.length === 0 || !frame ? (
          <section className="mt-16 max-w-[60ch]">
            <h2 className="text-2xl font-semibold tracking-tight">No benchmark data yet</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The server fetches Artificial Analysis on start and every two hours. If this stays empty, check that
              ARTIFICIAL_ANALYSIS_API_KEY is set in .env and that the daily request limit is not used up.
            </p>
          </section>
        ) : (
          <>
            <div className="sticky top-0 z-30 -mx-4 mt-8 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl md:-mx-10 md:px-10">
              <div className="flex flex-col gap-1 py-2 md:flex-row md:items-center md:justify-between md:gap-6">
                <SegmentedControl label="Benchmark index" options={metricOptions} value={metric} onChange={setMetric} className="-mx-3" />
                <div className="flex items-center gap-4">
                  <SegmentedControl label="Models shown" options={VIEWS} value={view} onChange={setView} className="-mx-3 md:mx-0" />
                  {hiddenIds.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setHiddenIds(new Set())}
                      className="h-9 shrink-0 rounded-md px-3 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Show {hiddenIds.size} hidden
                    </button>
                  )}
                </div>
              </div>
            </div>

            <section aria-label="Timeline" className="mt-8 scroll-mt-28">
              <TimelineControl
                mode={mode}
                onModeChange={setMode}
                frames={frames}
                index={current}
                onIndexChange={(i) => {
                  setPlaying(false);
                  setIndex(i);
                }}
                playing={playing}
                onTogglePlay={togglePlay}
              />
              <div className="mt-6 min-h-[52px]">{diff && <ChangeSummary frame={frame} previous={previous} diff={diff} />}</div>
            </section>

            <section className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-10">
              <div className="min-w-0 lg:col-span-8">
                <ChartLegend />
                <div className="mt-5">
                  <FrontierChart
                    frame={frame}
                    domain={domain}
                    metric={metric}
                    showFreeBand={showFreeBand}
                    newIds={newIds}
                    hoveredId={hoveredId}
                    onHover={setHoveredId}
                  />
                </div>
              </div>
              <aside className="lg:col-span-4">
                <Leaderboard
                  frame={frame}
                  previous={previous}
                  domain={domain}
                  metric={metric}
                  hoveredId={hoveredId}
                  onHover={setHoveredId}
                />
              </aside>
            </section>

            <section aria-labelledby="table-title" className="mt-20">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="table-title" className="text-2xl font-semibold tracking-tight">
                  Every model in view
                </h2>
                <span className="font-mono text-xs text-muted-foreground">
                  {frame.list.length} models · {frame.label}
                </span>
              </div>
              <div className="mt-6">
                <ModelTable
                  frame={frame}
                  previous={previous}
                  metric={metric}
                  newIds={newIds}
                  hoveredId={hoveredId}
                  onHover={setHoveredId}
                  onHide={(id) => setHiddenIds((prev) => new Set(prev).add(id))}
                />
              </div>
            </section>
          </>
        )}

        <SiteFooter botUsername={botUsername} />
      </main>
    </div>
  );
}
