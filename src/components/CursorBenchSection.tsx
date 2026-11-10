import { useMemo, useState } from "react";
import { CURSORBENCH_URL } from "~/openrouter/constants";
import type { CursorBench } from "~/openrouter/cursorBench";
import {
  CURSORBENCH_AXES,
  buildSeries,
  defaultShown,
  type CursorBenchAxis,
} from "~/lib/cursorBench";
import { CursorBenchChart } from "./CursorBenchChart";
import { CursorBenchLegend } from "./CursorBenchLegend";
import { SegmentedControl } from "./SegmentedControl";

export function CursorBenchSection({ data }: { data: CursorBench }) {
  const series = useMemo(() => buildSeries(data.entries), [data]);
  const [axis, setAxis] = useState<CursorBenchAxis>("cost");
  const [shown, setShown] = useState(() => defaultShown(series));
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const visible = series.filter((s) => shown.has(s.model));

  const toggle = (model: string) =>
    setShown((prev) => {
      const next = new Set(prev);
      if (!next.delete(model)) next.add(model);
      return next;
    });

  return (
    <section aria-labelledby="cursorbench-title" className="mt-16">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="max-w-[65ch]">
          <h2 id="cursorbench-title" className="text-lg font-semibold">
            CursorBench {data.version}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Real coding tasks run in the Cursor agent. Each line is one model
            across its reasoning efforts. Higher and further right is better.
            Pick models below the chart.{" "}
            <a
              href={CURSORBENCH_URL}
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
            >
              Source
            </a>
          </p>
        </div>
        <SegmentedControl
          label="CursorBench x axis"
          options={CURSORBENCH_AXES}
          value={axis}
          onChange={setAxis}
          className="-mx-3 shrink-0"
        />
      </div>
      <div className="mt-6">
        {visible.length > 0 ? (
          <CursorBenchChart
            version={data.version}
            series={visible}
            axis={axis}
            highlighted={highlighted}
          />
        ) : (
          <p className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Pick a model below to plot it.
          </p>
        )}
      </div>
      <div className="mt-4">
        <CursorBenchLegend
          series={series}
          shown={shown}
          onToggle={toggle}
          onHover={setHighlighted}
        />
      </div>
    </section>
  );
}
