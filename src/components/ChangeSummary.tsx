import type { Frame, FrameDiff } from "~/lib/frames";

interface ChangeSummaryProps {
  frame: Frame;
  previous: Frame | undefined;
  diff: FrameDiff;
}

function names(list: Array<{ name: string }>, max = 3): string {
  const shown = list.slice(0, max).map((m) => m.name);
  return list.length > max
    ? `${shown.join(", ")} +${list.length - max} more`
    : shown.join(", ");
}

export function ChangeSummary({ frame, previous, diff }: ChangeSummaryProps) {
  if (!previous) {
    return (
      <p className="text-sm text-muted-foreground">
        Starting point. Move the slider to see what changed.
      </p>
    );
  }

  const movers = [...diff.scoreChanges.entries()]
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3)
    .map(([id, delta]) => ({
      name: frame.list.find((m) => m.id === id)?.name ?? id,
      delta,
    }));
  const leader = frame.list[0];
  const items: Array<{
    key: string;
    label: string;
    body: string;
    tone: "up" | "down" | "accent" | "muted";
  }> = [];

  if (diff.leaderChanged && leader)
    items.push({
      key: "leader",
      label: "New #1",
      body: leader.name,
      tone: "accent",
    });
  if (diff.entered.length)
    items.push({
      key: "in",
      label: "Entered the ranking",
      body: names(diff.entered),
      tone: "up",
    });
  if (diff.dropped.length)
    items.push({
      key: "out",
      label: "Dropped out",
      body: names(diff.dropped),
      tone: "down",
    });
  if (movers.length) {
    items.push({
      key: "moved",
      label: `${diff.scoreChanges.size} score${diff.scoreChanges.size === 1 ? "" : "s"} changed`,
      body: movers
        .map(
          (mv) => `${mv.name} ${mv.delta > 0 ? "+" : ""}${mv.delta.toFixed(1)}`,
        )
        .join(", "),
      tone: "muted",
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No ranking changes since {previous.label}.
      </p>
    );
  }

  const toneClass = {
    up: "text-up",
    down: "text-down",
    accent: "text-primary",
    muted: "text-muted-foreground",
  } as const;

  return (
    <ul
      key={frame.key}
      className="grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {items.map((item, i) => (
        <li
          key={item.key}
          className="animate-rise min-w-0"
          style={{ "--i": i } as React.CSSProperties}
        >
          <div
            className={`font-mono text-[11px] uppercase tracking-wider ${toneClass[item.tone]}`}
          >
            {item.label}
          </div>
          <div className="mt-1 text-sm leading-snug">{item.body}</div>
        </li>
      ))}
    </ul>
  );
}
