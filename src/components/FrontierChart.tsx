import { useEffect, useMemo, useRef, useState } from "react";
import type { EnrichedModel } from "~/openrouter/enrich";
import { CLAUDE_MAXED_EUR_PER_M, OPENAI_MAXED_EUR_PER_M } from "~/openrouter/constants";
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
  newIds: Set<string>;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}

type Placed = { model: EnrichedModel; x: number; y: number; visible: boolean; order: number };
type Box = { x: number; y: number; w: number; h: number };

const X_TICKS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
const MOVE = "transform 0.95s var(--ease-out-expo), opacity 0.5s var(--ease-out-expo)";

function niceStep(range: number): number {
  const raw = range / 5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function FrontierChart({ frame, domain, metric, showFreeBand, newIds, hoveredId, onHover }: FrontierChartProps) {
  const [containerRef, width] = useWidth<HTMLDivElement>();
  const seen = useRef(new Map<string, Placed>());
  const isMobile = width > 0 && width < 640;
  const height = isMobile ? 400 : 560;
  const m = isMobile ? { top: 24, right: 14, bottom: 40, left: 34 } : { top: 32, right: 28, bottom: 48, left: 48 };
  const plotW = Math.max(0, width - m.left - m.right);
  const plotH = height - m.top - m.bottom;
  const band = showFreeBand ? (isMobile ? 34 : 64) : 0;
  const xMax = domain.xMax * 1.08;

  const xPrice = (price: number) => m.left + band + (Math.sqrt(price) / Math.sqrt(xMax)) * (plotW - band);
  const xOf = (model: EnrichedModel) =>
    isFreeModel(model) ? m.left + 8 + ((hashString(model.id) % 100) / 100) * Math.max(0, band - 16) : xPrice(model.avgPriceEur);
  const yOf = (score: number) => m.top + ((domain.yMax - score) / (domain.yMax - domain.yMin)) * plotH;

  const placed = useMemo(() => {
    if (width === 0) return [];
    const visibleIds = new Set(frame.list.map((d) => d.id));
    for (const p of seen.current.values()) p.visible = visibleIds.has(p.model.id);
    frame.list.forEach((model, i) => {
      const prev = seen.current.get(model.id);
      seen.current.set(model.id, { model, x: xOf(model), y: yOf(model.score), visible: true, order: prev?.order ?? i });
    });
    return [...seen.current.values()];
  }, [frame, width, domain, band]);

  const frontier = useMemo(
    () =>
      placed
        .filter((p) => p.visible && frame.pareto.has(p.model.id))
        .sort((a, b) => a.model.avgPriceEur - b.model.avgPriceEur || a.x - b.x),
    [placed, frame],
  );
  const frontierPath = frontier.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = frontier.length
    ? `${frontierPath} L${(frontier.at(-1)?.x ?? 0).toFixed(1)},${m.top + plotH} L${(frontier[0]?.x ?? 0).toFixed(1)},${m.top + plotH} Z`
    : "";

  const labels = useMemo(() => {
    const wanted = placed.filter(
      (p) => p.visible && (frame.pareto.has(p.model.id) || frame.ranks.get(p.model.id) === 1 || p.model.id === hoveredId),
    );
    wanted.sort((a, b) => (a.model.id === hoveredId ? -1 : b.model.id === hoveredId ? 1 : a.y - b.y));
    const boxes: Box[] = placed.filter((p) => p.visible).map((p) => ({ x: p.x - 6, y: p.y - 6, w: 12, h: 12 }));
    const out: Array<{ id: string; x: number; y: number; text: string; strong: boolean }> = [];
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
        const inside = box.x >= 0 && box.x + w <= width && box.y >= 0 && box.y + h <= height;
        return inside && !taken.some((t) => overlaps(t, box)) && !boxes.some((b) => overlaps(b, box));
      });
      const chosen = fit ?? (p.model.id === hoveredId ? candidates[0] : undefined);
      if (!chosen) continue;
      taken.push({ x: chosen.x, y: chosen.y, w, h });
      out.push({ id: p.model.id, x: chosen.x + w / 2, y: chosen.y + h - 3, text, strong: frame.pareto.has(p.model.id) });
    }
    return out;
  }, [placed, frame, hoveredId, isMobile, width, height]);

  const step = niceStep(domain.yMax - domain.yMin);
  const yTicks: number[] = [];
  for (let v = Math.ceil(domain.yMin / step) * step; v <= domain.yMax; v += step) yTicks.push(Number(v.toFixed(4)));
  const minGap = isMobile ? 30 : 40;
  const xTicks = X_TICKS.filter((t) => t <= xMax).reduceRight<number[]>((kept, t) => {
    const next = kept[0];
    if (next === undefined || xPrice(next) - xPrice(t) >= minGap) kept.unshift(t);
    return kept;
  }, []);
  const hovered = placed.find((p) => p.model.id === hoveredId && p.visible) ?? null;
  const metricLabel = METRIC_LABELS[metric];

  return (
    <div ref={containerRef} className="relative w-full select-none" style={{ height }}>
      {width === 0 ? (
        <div className="absolute inset-0 overflow-hidden rounded-[18px] bg-muted/40">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent animate-[shimmer_1.6s_linear_infinite]" />
        </div>
      ) : (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Price versus ${metricLabel} Index for ${frame.list.length} models, ${frame.label}`}
          className="overflow-visible"
          onMouseLeave={() => onHover(null)}
        >
          <defs>
            <linearGradient id="frontier-wash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(var(--primary))" stopOpacity="0.16" />
              <stop offset="100%" stopColor="oklch(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>

          {band > 0 && (
            <g>
              <rect x={m.left} y={m.top} width={band} height={plotH} fill="oklch(var(--muted))" opacity={0.55} rx={8} />
              <text
                x={m.left + band / 2}
                y={m.top + plotH + (isMobile ? 18 : 22)}
                textAnchor="middle"
                className="fill-muted-foreground font-mono"
                fontSize={isMobile ? 9 : 10}
                letterSpacing="0.08em"
              >
                FREE
              </text>
            </g>
          )}

          <rect
            x={m.left + band}
            y={m.top}
            width={Math.max(0, xPrice(1) - m.left - band)}
            height={plotH}
            fill="oklch(var(--primary))"
            opacity={0.05}
          />
          {!isMobile && (
            <text x={m.left + band + 8} y={m.top + 14} className="fill-muted-foreground font-mono" fontSize={10}>
              under €1
            </text>
          )}

          {yTicks.map((v) => (
            <g key={`${metric}-${v}`} style={{ animation: "fade-in 0.6s var(--ease-out-expo)" }}>
              <line x1={m.left} x2={m.left + plotW} y1={yOf(v)} y2={yOf(v)} stroke="oklch(var(--grid))" strokeWidth={1} />
              <text
                x={m.left - 10}
                y={yOf(v) + 3.5}
                textAnchor="end"
                className="fill-muted-foreground font-mono tabular"
                fontSize={isMobile ? 9 : 11}
              >
                {v}
              </text>
            </g>
          ))}

          {xTicks.map((t) => (
            <g key={t}>
              <line x1={xPrice(t)} x2={xPrice(t)} y1={m.top} y2={m.top + plotH} stroke="oklch(var(--grid))" strokeWidth={1} />
              <text
                x={xPrice(t)}
                y={m.top + plotH + (isMobile ? 18 : 22)}
                textAnchor="middle"
                className="fill-muted-foreground font-mono tabular"
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
                    className="fill-muted-foreground font-mono"
                    fontSize={10}
                  >
                    {r.label}
                  </text>
                )}
              </g>
            ))}

          {areaPath && (
            <path
              key={`area-${frame.key}-${metric}`}
              d={areaPath}
              fill="url(#frontier-wash)"
              style={{ animation: "fade-in 1.2s var(--ease-out-expo)" }}
            />
          )}
          {frontierPath && (
            <path
              key={`line-${frame.key}-${metric}-${width}`}
              d={frontierPath}
              pathLength={1}
              strokeDasharray={1}
              fill="none"
              stroke="oklch(var(--primary))"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ animation: "draw 1.2s var(--ease-out-expo) both" }}
            />
          )}

          {hovered && (
            <g pointerEvents="none" style={{ animation: "fade-in 0.25s var(--ease-out-expo)" }}>
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
            const isNew = p.visible && newIds.has(p.model.id);
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
                <g
                  className="svg-origin-center"
                  style={{ animation: `pop 0.8s var(--ease-out-expo) ${Math.min(p.order, 30) * 35}ms both` }}
                >
                  {isNew && (
                    <circle
                      r={6}
                      fill={free ? "oklch(var(--foreground))" : color}
                      className="svg-origin-center motion-ripple"
                      style={{ animation: "ripple 2.2s var(--ease-out-expo) infinite" }}
                    />
                  )}
                  {isPareto && <circle r={10} fill="none" stroke="oklch(var(--primary))" strokeWidth={1.5} />}
                  <circle
                    r={isPareto ? 6 : 5}
                    fill={free ? "var(--surface-ring)" : color}
                    stroke={free ? "oklch(var(--foreground))" : "var(--surface-ring)"}
                    strokeWidth={2}
                  />
                </g>
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
                animation: "fade-in 0.5s var(--ease-out-expo)",
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
            className="fill-muted-foreground font-mono"
            fontSize={isMobile ? 9 : 10}
            letterSpacing="0.06em"
          >
            {metricLabel.toUpperCase()} INDEX
          </text>
          {!isMobile && (
            <text
              x={m.left + plotW}
              y={height - 6}
              textAnchor="end"
              className="fill-muted-foreground font-mono"
              fontSize={10}
              letterSpacing="0.06em"
            >
              € PER 1M TOKENS, AVG IN + OUT
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
