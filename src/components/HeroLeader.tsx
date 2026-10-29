import type { EnrichedModel } from "~/openrouter/enrich";
import { METRIC_LABELS, type Metric } from "~/openrouter/model";
import { labColor } from "~/lib/labs";
import { AnimatedNumber } from "./AnimatedNumber";

interface HeroLeaderProps {
  leader: EnrichedModel | undefined;
  runnerUp: EnrichedModel | undefined;
  metric: Metric;
  frameLabel: string;
}

export function HeroLeader({ leader, runnerUp, metric, frameLabel }: HeroLeaderProps) {
  if (!leader) {
    return <p className="text-sm text-muted-foreground">No scored models for this index yet.</p>;
  }
  const lead = runnerUp ? leader.score - runnerUp.score : null;
  return (
    <div className="animate-rise" style={{ "--i": 2 } as React.CSSProperties}>
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        #1 on {METRIC_LABELS[metric]} · {frameLabel}
      </div>
      <div className="mt-3 flex items-end gap-4">
        <AnimatedNumber
          value={leader.score}
          className="text-[64px] font-semibold leading-[0.85] tracking-tighter md:text-[88px]"
        />
        <div className="pb-1.5 min-w-0">
          <div key={leader.id} className="flex items-center gap-2" style={{ animation: "rise 0.5s var(--ease-out-expo)" }}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: labColor(leader.creator) }} />
            <span className="truncate text-lg font-semibold tracking-tight">{leader.name}</span>
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground tabular">
            {leader.creator} · €{leader.avgPriceEur.toFixed(2)}/1M
            {lead != null && runnerUp ? ` · +${lead.toFixed(1)} over ${runnerUp.name}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
