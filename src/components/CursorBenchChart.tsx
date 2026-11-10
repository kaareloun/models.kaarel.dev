import { useId, useMemo, useState } from "react";
import type { CursorBenchEntry } from "~/openrouter/cursorBench";
import {
  CURSORBENCH_AXIS_TITLES,
  axisValue,
  formatAxisValue,
  type CursorBenchAxis,
  type CursorBenchSeries,
} from "~/lib/cursorBench";
import { useSize } from "~/lib/useSize";
import { CursorBenchTooltip } from "./CursorBenchTooltip";

interface CursorBenchChartProps {
  version: string;
  series: CursorBenchSeries[];
  axis: CursorBenchAxis;
  highlighted: string | null;
}

type Box = { x: number; y: number; w: number; h: number };
type Point = { entry: CursorBenchEntry; x: number; y: number; inside: boolean };

const X_TICK_COUNT = 4;
const X_DOMAIN_QUANTILE = 0.95;

function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (
    (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 4 ? 4 : n <= 5 ? 5 : 10) *
    pow
  );
}

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

function middleOutOrder<T>(items: T[]): T[] {
  const mid = Math.floor((items.length - 1) / 2);
  return [...items]
    .map((item, i) => ({ item, d: Math.abs(i - mid) + (i < mid ? 0.5 : 0) }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.item);
}

export function CursorBenchChart({
  version,
  series,
  axis,
  highlighted,
}: CursorBenchChartProps) {
  const clipId = useId();
  const [containerRef, { width, height }] = useSize<HTMLDivElement>();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const isMobile = width > 0 && width < 640;
  const m = isMobile
    ? { top: 28, right: 12, bottom: 44, left: 38 }
    : { top: 36, right: 24, bottom: 56, left: 48 };
  const plotW = Math.max(0, width - m.left - m.right);
  const plotH = Math.max(0, height - m.top - m.bottom);

  const domain = useMemo(() => {
    const xs = series
      .flatMap((s) => s.points.map((p) => axisValue(p, axis)))
      .sort((a, b) => a - b);
    const scores = series.flatMap((s) => s.points.map((p) => p.score));
    const q = xs[Math.floor(X_DOMAIN_QUANTILE * (xs.length - 1))] ?? 1;
    const xStep = niceStep(Math.max(q, 1e-6) / X_TICK_COUNT);
    return {
      xMax: Math.max(xStep, Math.ceil(q / xStep) * xStep),
      xStep,
      yMin: Math.floor((Math.min(...scores) - 2) / 5) * 5,
      yMax: Math.ceil(Math.max(...scores) / 5) * 5,
    };
  }, [series, axis]);

  const xOf = (v: number) => m.left + plotW * (1 - v / domain.xMax);
  const yOf = (score: number) =>
    m.top + ((domain.yMax - score) / (domain.yMax - domain.yMin)) * plotH;

  const placed = series.map((s) => ({
    series: s,
    points: [...s.points]
      .sort((a, b) => axisValue(b, axis) - axisValue(a, axis))
      .map<Point>((entry) => {
        const v = axisValue(entry, axis);
        return {
          entry,
          x: xOf(v),
          y: yOf(entry.score),
          inside: v <= domain.xMax,
        };
      }),
  }));

  const placeLabels = () => {
    if (width === 0) return [];
    const fontSize = isMobile ? 10 : 12;
    const pointBoxes: Box[] = placed.flatMap((s) =>
      s.points
        .filter((p) => p.inside)
        .map((p) => ({ x: p.x - 5, y: p.y - 5, w: 10, h: 10 })),
    );
    const taken: Box[] = [];
    const out: Array<{ model: string; color: string; x: number; y: number }> =
      [];
    for (const s of placed) {
      const text = s.series.model;
      const w = text.length * fontSize * 0.56 + 4;
      const h = fontSize + 2;
      const anchors = middleOutOrder(s.points.filter((p) => p.inside));
      let chosen: Box | undefined;
      for (const p of anchors) {
        const candidates: Box[] = [
          { x: p.x - w / 2, y: p.y - h - 8, w, h },
          { x: p.x - w / 2, y: p.y + 8, w, h },
          { x: p.x + 9, y: p.y - h / 2, w, h },
          { x: p.x - w - 9, y: p.y - h / 2, w, h },
        ];
        chosen = candidates.find(
          (c) =>
            c.x >= m.left &&
            c.x + c.w <= width - 2 &&
            c.y >= m.top - 4 &&
            c.y + c.h <= m.top + plotH &&
            !taken.some((t) => overlaps(t, c)) &&
            !pointBoxes.some((b) => overlaps(b, c)),
        );
        if (chosen) break;
      }
      if (!chosen) continue;
      taken.push(chosen);
      out.push({
        model: text,
        color: s.series.color,
        x: chosen.x + w / 2,
        y: chosen.y + h - 3,
      });
    }
    return out;
  };
  const labels = placeLabels();

  const yTicks: number[] = [];
  for (let v = domain.yMin; v <= domain.yMax; v += 5) yTicks.push(v);
  const xTicks: number[] = [];
  for (let v = 0; v <= domain.xMax + 1e-9; v += domain.xStep) xTicks.push(v);

  const hovered = placed
    .flatMap((s) => s.points)
    .find((p) => p.entry.id === hoveredId && p.inside);
  const focusModel = hovered?.entry.model ?? highlighted;
  const fontSize = isMobile ? 10 : 12;

  return (
    <div
      ref={containerRef}
      className="relative h-[380px] w-full select-none sm:h-[560px]"
    >
      {width === 0 ? (
        <div className="absolute inset-0 rounded-md bg-muted/40" />
      ) : (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`CursorBench ${version} score by ${CURSORBENCH_AXIS_TITLES[axis].toLowerCase()} for ${series.map((s) => s.model).join(", ")}`}
          className="overflow-visible"
          onMouseLeave={() => setHoveredId(null)}
        >
          <defs>
            <clipPath id={clipId}>
              <rect
                x={m.left - 8}
                y={m.top - 8}
                width={plotW + 16}
                height={plotH + 16}
              />
            </clipPath>
          </defs>

          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={m.left}
                x2={m.left + plotW}
                y1={yOf(v)}
                y2={yOf(v)}
                stroke="oklch(var(--grid))"
                strokeWidth={1}
              />
              <text
                x={m.left - 10}
                y={yOf(v) + 4}
                textAnchor="end"
                className="tabular fill-muted-foreground"
                fontSize={isMobile ? 9 : 11}
              >
                {v}%
              </text>
            </g>
          ))}

          {xTicks.map((v) => (
            <g key={v}>
              <line
                x1={xOf(v)}
                x2={xOf(v)}
                y1={m.top}
                y2={m.top + plotH}
                stroke="oklch(var(--grid))"
                strokeWidth={1}
              />
              <text
                x={xOf(v)}
                y={m.top + plotH + (isMobile ? 18 : 22)}
                textAnchor="middle"
                className="tabular fill-muted-foreground"
                fontSize={isMobile ? 9 : 11}
              >
                {formatAxisValue(v, axis)}
              </text>
            </g>
          ))}

          <text
            x={m.left}
            y={m.top - 14}
            className="fill-muted-foreground"
            fontSize={isMobile ? 10 : 11}
          >
            CursorBench {version} score
          </text>
          <text
            x={m.left + plotW / 2}
            y={height - 6}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={isMobile ? 10 : 11}
          >
            {CURSORBENCH_AXIS_TITLES[axis]}
          </text>

          <g clipPath={`url(#${clipId})`}>
            {placed.map((s) => {
              const dimmed =
                focusModel !== null && focusModel !== s.series.model;
              return (
                <g
                  key={s.series.model}
                  style={{
                    opacity: dimmed ? 0.15 : 1,
                    transition: "opacity 0.2s var(--ease-out-expo)",
                  }}
                >
                  <path
                    d={s.points
                      .map(
                        (p, i) =>
                          `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`,
                      )
                      .join(" ")}
                    fill="none"
                    stroke={s.series.color}
                    strokeOpacity={0.6}
                    strokeWidth={isMobile ? 1.5 : 2}
                    strokeLinejoin="round"
                  />
                  {s.points
                    .filter((p) => p.inside)
                    .map((p) => (
                      <g
                        key={p.entry.id}
                        transform={`translate(${p.x} ${p.y})`}
                      >
                        <circle
                          r={
                            p.entry.id === hoveredId ? 6 : isMobile ? 3.5 : 4.5
                          }
                          fill={s.series.color}
                          stroke="oklch(var(--background))"
                          strokeWidth={1.5}
                        />
                        <circle
                          r={12}
                          fill="transparent"
                          className="cursor-pointer"
                          onPointerEnter={() => setHoveredId(p.entry.id)}
                          onPointerDown={() => setHoveredId(p.entry.id)}
                        />
                      </g>
                    ))}
                </g>
              );
            })}
          </g>

          {labels.map((l) => (
            <text
              key={l.model}
              x={l.x}
              y={l.y}
              textAnchor="middle"
              fontSize={fontSize}
              fontWeight={500}
              fill={l.color}
              pointerEvents="none"
              style={{
                opacity:
                  focusModel !== null && focusModel !== l.model ? 0.15 : 1,
                paintOrder: "stroke",
                stroke: "oklch(var(--background))",
                strokeWidth: 4,
                strokeLinejoin: "round",
              }}
            >
              {l.model}
            </text>
          ))}
        </svg>
      )}
      {hovered && (
        <CursorBenchTooltip
          entry={hovered.entry}
          x={hovered.x}
          y={hovered.y}
          containerWidth={width}
        />
      )}
    </div>
  );
}
