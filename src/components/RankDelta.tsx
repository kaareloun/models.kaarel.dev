import { ArrowDown, ArrowUp } from "lucide-react";

interface RankDeltaProps {
  current: number;
  previous: number | undefined;
  hasPrevious: boolean;
}

export function RankDelta({ current, previous, hasPrevious }: RankDeltaProps) {
  if (!hasPrevious) return <span className="w-10" />;
  if (previous === undefined) {
    return (
      <span className="w-10 text-right text-xs text-muted-foreground">new</span>
    );
  }
  const delta = previous - current;
  if (delta === 0)
    return (
      <span className="w-10 text-right text-xs text-muted-foreground">–</span>
    );
  const Icon = delta > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={`tabular inline-flex w-10 items-center justify-end gap-0.5 text-xs ${delta > 0 ? "text-up" : "text-down"}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
      {Math.abs(delta)}
    </span>
  );
}
