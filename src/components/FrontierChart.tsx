import { useEffect, useMemo, useRef, useState } from "react";
import type { EnrichedModel } from "~/openrouter/enrich";
import {
  CLAUDE_MAXED_EUR_PER_M,
  OPENAI_MAXED_EUR_PER_M,
} from "~/openrouter/constants";
import { METRIC_LABELS, type Metric } from "~/openrouter/model";
import { hashString, isFreeModel } from "~/openrouter/pricing";
import type { Domain, Frame } from "~/lib/frames";
import { labColor } from "~/lib/labs";
import { ChartTooltip } from "./ChartTooltip";

interface FrontierChartProps {
  frame: Frame;
  domain: Domain;
  metric: Metric;
  showFreeBand: boolean;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}

type Placed = {
  model: EnrichedModel;
  x: number;
  y: number;
  visible: boolean;
};
type Box = { x: number; y: number; w: number; h: number };

const X_TICKS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
const MOVE =
  "transform 0.95s var(--ease-out-expo), opacity 0.5s var(--ease-out-expo)";

function niceStep(range: number): number {
  const raw = range / 5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(
      ([entry]) =>
        entry &&
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export function FrontierChart({
  frame,
  domain,
  metric,
  showFreeBand,
  hoveredId,
  onHover,
}: FrontierChartProps) {
  const [containerRef, { width, height }] = useSize<HTMLDivElement>();
  const seen = useRef(new Map<string, Placed>());
  const isMobile = width > 0 && width < 640;
  const m = isMobile
    ? { top: 24, right: 14, bottom: 40, left: 34 }
    : { top: 32, right: 28, bottom: 48, left: 48 };
  const plotW = Math.max(0, width - m.left - m.right);
  const plotH = height - m.top - m.bottom;
  const band = showFreeBand ? (isMobile ? 34 : 64) : 0;
  const xMax = domain.xMax * 1.08;

  const xPrice = (price: number) =>
    m.left + band + (Math.sqrt(price) / Math.sqrt(xMax)) * (plotW - band);
  const xOf = (model: EnrichedModel) =>
    isFreeModel(model)
      ? m.left +
        8 +
        ((hashString(model.id) % 100) / 100) * Math.max(0, band - 16)
      : xPrice(model.avgPriceEur);
  const yOf = (score: number) =>
    m.top + ((domain.yMax - score) / (domain.yMax - domain.yMin)) * plotH;

  const placed = useMemo(() => {
    if (width === 0) return [];
    const visibleIds = new Set(frame.list.map((d) => d.id));
    for (const p of seen.current.values())
      p.visible = visibleIds.has(p.model.id);
    for (const model of frame.list) {
      seen.current.set(model.id, {
        model,
        x: xOf(model),
        y: yOf(model.score),
        visible: true,
      });
    }
    return [...seen.current.values()];
  }, [frame, width, domain, band]);

  const frontier = useMemo(
    () =>
      placed
        .filter((p) => p.visible && frame.pareto.has(p.model.id))
        .sort((a, b) => a.model.avgPriceEur - b.model.avgPriceEur || a.x - b.x),
    [placed, frame],
  );
  const frontierPath = frontier
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const labels = useMemo(() => {
    const wanted = placed.filter(
      (p) =>
        p.visible &&
        (frame.pareto.has(p.model.id) ||
          frame.ranks.get(p.model.id) === 1 ||
          p.model.id === hoveredId),
    );
    wanted.sort((a, b) =>
      a.model.id === hoveredId ? -1 : b.model.id === hoveredId ? 1 : a.y - b.y,
    );
    const boxes: Box[] = placed
      .filter((p) => p.visible)
      .map((p) => ({ x: p.x - 6, y: p.y - 6, w: 12, h: 12 }));
    const out: Array<{
      id: string;
      x: number;
      y: number;
      text: string;
      strong: boolean;
    }> = [];
    const taken: Box[] = [];
    for (const p of wanted) {
      const text = p.model.name;
      const w = text.length * (isMobile ? 5.6 : 6.3) + 6;
      const h = 14;
      const candidates = [
        { x: p.x - w / 2, y: p.y - 22 },
        { x: p.x - w / 2, y: p.y + 10 },
        { x: p.x + 10, y: p.y - h / 2 },
        { x: p.x - w - 10, y: p.y - h / 2 },
      ];
      const fit = candidates.find((c) => {
        const box = { x: c.x, y: c.y, w, h };
        const inside =
          box.x >= 0 && box.x + w <= width && box.y >= 0 && box.y + h <= height;
        return (
          inside &&
          !taken.some((t) => overlaps(t, box)) &&
          !boxes.some((b) => overlaps(b, box))
        );
      });
      const chosen =
        fit ?? (p.model.id === hoveredId ? candidates[0] : undefined);
      if (!chosen) continue;
      taken.push({ x: chosen.x, y: chosen.y, w, h });
      out.push({
        id: p.model.id,
        x: chosen.x + w / 2,
        y: chosen.y + h - 3,
        text,
        strong: frame.pareto.has(p.model.id),
      });
    }
    return out;
  }, [placed, frame, hoveredId, isMobile, width, height]);

  const step = niceStep(domain.yMax - domain.yMin);
  const yTicks: number[] = [];
  for (
    let v = Math.ceil(domain.yMin / step) * step;
    v <= domain.yMax;
    v += step
  )
    yTicks.push(Number(v.toFixed(4)));
  const minGap = isMobile ? 30 : 40;
  const xTicks = X_TICKS.filter((t) => t <= xMax).reduceRight<number[]>(
    (kept, t) => {
      const next = kept[0];
      if (next === undefined || xPrice(next) - xPrice(t) >= minGap)
        kept.unshift(t);
      return kept;
    },
    [],
  );
  const hovered =
    placed.find((p) => p.model.id === hoveredId && p.visible) ?? null;
  const metricLabel = METRIC_LABELS[metric];

  return (
    <div
      ref={containerRef}
      className="relative h-[400px] w-full select-none sm:h-[560px]"
    >
      {width === 0 ? (
        <div className="absolute inset-0 rounded-md bg-muted/40" />
      ) : (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Price versus ${metricLabel} Index for ${frame.list.length} models, ${frame.label}`}
          className="overflow-visible"
          onMouseLeave={() => onHover(null)}
        >
          {band > 0 && (
            <g>
              <rect
                x={m.left}
                y={m.top}
                width={band}
                height={plotH}
                fill="oklch(var(--muted))"
                opacity={0.55}
              />
              <text
                x={m.left + band / 2}
                y={m.top + plotH + (isMobile ? 18 : 22)}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={isMobile ? 10 : 11}
              >
                Free
              </text>
            </g>
          )}

          {yTicks.map((v) => (
            <g key={`${metric}-${v}`}>
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
                y={yOf(v) + 3.5}
                textAnchor="end"
                className="tabular fill-muted-foreground"
                fontSize={isMobile ? 9 : 11}
              >
                {v}
              </text>
            </g>
          ))}

          {xTicks.map((t) => (
            <g key={t}>
              <line
                x1={xPrice(t)}
                x2={xPrice(t)}
                y1={m.top}
                y2={m.top + plotH}
                stroke="oklch(var(--grid))"
                strokeWidth={1}
              />
              <text
                x={xPrice(t)}
                y={m.top + plotH + (isMobile ? 18 : 22)}
                textAnchor="middle"
                className="tabular fill-muted-foreground"
                fontSize={isMobile ? 9 : 11}
              >
                €{t}
              </text>
            </g>
          ))}
          <line
            x1={m.left}
            x2={m.left + plotW}
            y1={m.top + plotH}
            y2={m.top + plotH}
            stroke="oklch(var(--axis))"
            strokeWidth={1}
          />

          {[
            { v: OPENAI_MAXED_EUR_PER_M, label: "ChatGPT Pro, maxed" },
            { v: CLAUDE_MAXED_EUR_PER_M, label: "Claude Max, maxed" },
          ]
            .filter((r) => r.v <= xMax)
            .map((r, i) => (
              <g key={r.label}>
                <line
                  x1={xPrice(r.v)}
                  x2={xPrice(r.v)}
                  y1={m.top}
                  y2={m.top + plotH}
                  stroke="oklch(var(--foreground))"
                  strokeOpacity={0.28}
                  strokeWidth={1}
                />
                {!isMobile && (
                  <text
                    x={xPrice(r.v) + 6}
                    y={m.top + plotH - 10 - i * 14}
                    className="fill-muted-foreground"
                    fontSize={11}
                  >
                    {r.label}
                  </text>
                )}
              </g>
            ))}

          {frontierPath && (
            <path
              d={frontierPath}
              fill="none"
              stroke="oklch(var(--primary))"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {hovered && (
            <g pointerEvents="none">
              <line
                x1={hovered.x}
                x2={hovered.x}
                y1={hovered.y}
                y2={m.top + plotH}
                stroke="oklch(var(--foreground))"
                strokeOpacity={0.35}
                strokeWidth={1}
              />
              <line
                x1={m.left}
                x2={hovered.x}
                y1={hovered.y}
                y2={hovered.y}
                stroke="oklch(var(--foreground))"
                strokeOpacity={0.35}
                strokeWidth={1}
              />
            </g>
          )}

          {placed.map((p) => {
            const free = isFreeModel(p.model);
            const isPareto = p.visible && frame.pareto.has(p.model.id);
            const dimmed = hoveredId !== null && hoveredId !== p.model.id;
            const color = labColor(p.model.creator);
            return (
              <g
                key={p.model.id}
                style={{
                  transform: `translate(${p.x}px, ${p.y}px)`,
                  transition: MOVE,
                  opacity: p.visible ? (dimmed ? 0.3 : 1) : 0,
                  pointerEvents: p.visible ? "auto" : "none",
                }}
              >
                {isPareto && (
                  <circle
                    r={10}
                    fill="none"
                    stroke="oklch(var(--primary))"
                    strokeWidth={1.5}
                  />
                )}
                <circle
                  r={isPareto ? 6 : 5}
                  fill={free ? "var(--surface-ring)" : color}
                  stroke={
                    free ? "oklch(var(--foreground))" : "var(--surface-ring)"
                  }
                  strokeWidth={2}
                />
                <circle
                  r={16}
                  fill="transparent"
                  tabIndex={p.visible ? 0 : -1}
                  role="button"
                  aria-label={`${p.model.name}, ${metricLabel} ${p.model.score.toFixed(1)}, ${free ? "free" : `€${p.model.avgPriceEur.toFixed(2)} per million tokens`}`}
                  className="cursor-pointer outline-none"
                  onMouseEnter={() => onHover(p.model.id)}
                  onFocus={() => onHover(p.model.id)}
                  onBlur={() => onHover(null)}
                />
              </g>
            );
          })}

          {labels.map((l) => (
            <text
              key={l.id}
              x={0}
              y={0}
              textAnchor="middle"
              fontSize={isMobile ? 10 : 11}
              fontWeight={l.strong ? 600 : 500}
              className="fill-foreground"
              pointerEvents="none"
              style={{
                transform: `translate(${l.x}px, ${l.y}px)`,
                transition: MOVE,
                paintOrder: "stroke",
                stroke: "oklch(var(--background))",
                strokeWidth: 4,
                strokeLinejoin: "round",
              }}
            >
              {l.text}
            </text>
          ))}

          <text
            x={m.left}
            y={m.top - 12}
            className="fill-muted-foreground"
            fontSize={isMobile ? 10 : 11}
          >
            {metricLabel} index
          </text>
          {!isMobile && (
            <text
              x={m.left + plotW}
              y={height - 6}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize={11}
            >
              € per 1M tokens, mean of input and output
            </text>
          )}
        </svg>
      )}
      {hovered && (
        <ChartTooltip
          model={hovered.model}
          rank={frame.ranks.get(hovered.model.id) ?? null}
          metric={metric}
          isPareto={frame.pareto.has(hovered.model.id)}
          x={hovered.x}
          y={hovered.y}
          containerWidth={width}
        />
      )}
    </div>
  );
}
