import type { CursorBenchSeries } from "~/lib/cursorBench";

interface CursorBenchLegendProps {
  series: CursorBenchSeries[];
  shown: Set<string>;
  onToggle: (model: string) => void;
  onHover: (model: string | null) => void;
}

export function CursorBenchLegend({
  series,
  shown,
  onToggle,
  onHover,
}: CursorBenchLegendProps) {
  return (
    <ul
      aria-label="Models on the chart"
      className="-mx-2 flex flex-wrap gap-x-1 gap-y-0.5"
    >
      {series.map((s) => {
        const on = shown.has(s.model);
        return (
          <li key={s.model}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(s.model)}
              onMouseEnter={() => on && onHover(s.model)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => on && onHover(s.model)}
              onBlur={() => onHover(null)}
              className={`inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${on ? "text-foreground" : "text-muted-foreground"}`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={
                  on
                    ? { background: s.color }
                    : { boxShadow: `inset 0 0 0 1.5px ${s.color}` }
                }
              />
              {s.model}
              <span className="tabular text-xs text-muted-foreground">
                {s.best.toFixed(1)}%
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
