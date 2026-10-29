import { CHART_LABS, OTHER_LAB_COLOR } from "~/lib/labs";

export function ChartLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Chart legend">
      {CHART_LABS.map((l) => (
        <li key={l.creator} className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
          {l.creator}
        </li>
      ))}
      <li className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: OTHER_LAB_COLOR }} />
        Other labs
      </li>
      <li className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ boxShadow: "inset 0 0 0 2px oklch(var(--foreground))" }} />
        Free on Opencode Zen
      </li>
      <li className="inline-flex items-center gap-2">
        <span className="h-[2px] w-4 rounded-full bg-primary" />
        Pareto frontier
      </li>
      <li className="inline-flex items-center gap-2">
        <span className="relative inline-flex h-2.5 w-2.5">
          <span
            className="motion-ripple absolute inset-0 rounded-full bg-foreground/60"
            style={{ animation: "ripple 2.2s var(--ease-out-expo) infinite" }}
          />
          <span className="relative h-2.5 w-2.5 rounded-full bg-foreground/60" />
        </span>
        Released in the last 3 weeks
      </li>
    </ul>
  );
}
