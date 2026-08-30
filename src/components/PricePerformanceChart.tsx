import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  LabelList,
} from "recharts";
import { useMemo } from "react";
import type { OpenRouterModel } from "~/openrouter/parseData";
import { getAvgPriceEur, getChartPrice, getParetoIds, isFreeModel } from "~/openrouter/pricing";

interface PricePerformanceChartProps {
  models: OpenRouterModel[];
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
}

interface ChartDataPoint {
  id: string;
  name: string;
  displayName: string;
  price: number; // jittered for display
  avgPriceEur: number; // real price for pareto/value
  codingIndex: number;
  provider: string;
  value: number;
  isFree: boolean;
}

function getShortName(full: string): string {
  const colonIdx = full.indexOf(": ");
  if (colonIdx !== -1) return full.slice(colonIdx + 2).trim();
  const colon2 = full.indexOf(":");
  if (colon2 !== -1) return full.slice(colon2 + 1).trim();
  return full;
}

function priceFormatter(value: number | string) {
  const num = typeof value === "number" ? value : Number.parseFloat(value as string);
  return Math.round(num).toString();
}

function codingIndexFormatter(value: number | string) {
  const num = typeof value === "number" ? value : Number.parseFloat(value as string);
  return num.toFixed(1);
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold leading-tight">{d.displayName}</p>
      <p className="text-muted-foreground text-xs mb-1">{d.provider}</p>
      <p>Price: {d.isFree ? "Free" : `${d.price.toFixed(2)}€ / 1M`}</p>
      <p>Coding Index: {d.codingIndex.toFixed(1)}</p>
      <p className="text-amber-600 font-medium">Value: {d.isFree ? "∞ (Free)" : d.value.toFixed(1)}</p>
    </div>
  );
}

export function PricePerformanceChart({ models, hoveredId, onHover }: PricePerformanceChartProps) {
  const chartData: ChartDataPoint[] = useMemo(
    () =>
      models
        .filter((m) => m.coding_index !== null)
        .map((model) => {
          const avgPriceEur = getAvgPriceEur(model);
          const isFree = isFreeModel(model);
          const coding = model.coding_index ?? 0;
          const price = getChartPrice(model); // jittered for display, pareto uses avgPriceEur
          return {
            id: model.id,
            name: model.name,
            displayName: getShortName(model.name),
            price,
            avgPriceEur,
            codingIndex: coding,
            provider: model.providerId,
            value: isFree ? 999 + coding : avgPriceEur > 0 ? coding / avgPriceEur : 0,
            isFree,
          };
        }),
    [models],
  );

  const maxPrice = chartData.length > 0 ? Math.max(...chartData.map((d) => d.price)) : 5;
  const maxPriceCeil = Math.ceil(maxPrice);

  const codingIndices = chartData.map((d) => d.codingIndex);
  const maxCodingIndex = codingIndices.length > 0 ? Math.max(...codingIndices) : 10;
  const minCodingIndex = codingIndices.length > 0 ? Math.min(...codingIndices) : 0;

  const yMin = Math.max(0, Math.floor(minCodingIndex) - 1);
  const yMax = Math.ceil(maxCodingIndex) + 1;
  const yTicks = Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i);
  const bestValueMax = 1;
  const paretoIds = useMemo(
    () => getParetoIds(chartData.map((d) => ({ id: d.id, avgPriceEur: d.avgPriceEur, coding_index: d.codingIndex }))),
    [chartData],
  );
  const paretoData = chartData.filter((d) => paretoIds.has(d.id));
  const restData = chartData.filter((d) => !paretoIds.has(d.id));
  const hoveredData = hoveredId ? chartData.filter((d) => d.id === hoveredId) : [];

  return (
    <div className="w-full">
      <div className="w-full h-[620px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart data={chartData} margin={{ top: 40, right: 30, left: 60, bottom: 40 }} tabIndex={-1}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <ReferenceArea
            x1={0}
            x2={Math.min(bestValueMax, maxPriceCeil)}
            y1={yMin}
            y2={yMax}
            fill="#22c55e"
            fillOpacity={0.08}
            strokeOpacity={0}
            label={{
              value: "Best value",
              position: "insideTopLeft",
              fill: "#16a34a",
              fontSize: 11,
              offset: 8,
            }}
          />
          <ReferenceLine
            x={bestValueMax}
            stroke="#16a34a"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{
              value: "1€",
              position: "top",
              fill: "#16a34a",
              fontSize: 11,
              offset: 8,
            }}
          />
          <XAxis
            type="number"
            dataKey="price"
            name="Price"
            unit="€"
            tickFormatter={priceFormatter}
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: "#888" }}
            tickLine={{ stroke: "#888" }}
            tickCount={Math.min(10, Math.max(5, maxPriceCeil + 1))}
            domain={[0, maxPriceCeil]}
            label={{
              value: "Price (€ per 1M tokens, avg input+output)",
              position: "insideBottom",
              offset: -30,
              style: { textAnchor: "middle", fontSize: 12, fill: "#666" },
            }}
          />
          <YAxis
            type="number"
            dataKey="codingIndex"
            name="Artificial Analysis Coding Index"
            tickFormatter={codingIndexFormatter}
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: "#888" }}
            tickLine={{ stroke: "#888" }}
            domain={[yMin, yMax]}
            ticks={yTicks}
            allowDataOverflow
            label={{
              value: "Artificial Analysis Coding Index",
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle", fontSize: 12, fill: "#666" },
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
          <Scatter
            name="Models"
            data={restData}
            fill="#3b82f6"
            stroke="#2563eb"
            strokeWidth={1}
            onMouseEnter={(p: unknown) => {
              const d = (p as { payload?: ChartDataPoint })?.payload;
              if (d?.id) onHover?.(d.id);
            }}
            onMouseLeave={() => onHover?.(null)}
          >
            <LabelList
              dataKey="displayName"
              position="top"
              offset={12}
              style={{ fontSize: 10, fill: "hsl(var(--foreground))", fontWeight: 500, pointerEvents: "none" } as never}
            />
          </Scatter>
          <Scatter
            name="Pareto frontier"
            data={[...paretoData].sort((a, b) => a.avgPriceEur - b.avgPriceEur)}
            fill="#f59e0b"
            stroke="#d97706"
            strokeWidth={2}
            line={{ stroke: "#f59e0b", strokeWidth: 2, strokeOpacity: 0.6 }}
            lineType="joint"
            onMouseEnter={(p: unknown) => {
              const d = (p as { payload?: ChartDataPoint })?.payload;
              if (d?.id) onHover?.(d.id);
            }}
            onMouseLeave={() => onHover?.(null)}
          >
            <LabelList
              dataKey="displayName"
              position="top"
              offset={12}
              style={{ fontSize: 10, fill: "#92400e", fontWeight: 700, pointerEvents: "none" } as never}
            />
          </Scatter>
          {hoveredData.length > 0 && (
            <Scatter
              data={hoveredData}
              isAnimationActive={false}
              shape={(props: unknown) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: ChartDataPoint };
                const isPareto = paretoIds.has((payload as ChartDataPoint).id);
                const color = isPareto ? "#f59e0b" : "#3b82f6";
                const stroke = isPareto ? "#d97706" : "#2563eb";
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={14} fill={color} fillOpacity={0.14} />
                    <circle cx={cx} cy={cy} r={7} fill={color} stroke="white" strokeWidth={2} />
                    <circle cx={cx} cy={cy} r={7} fill="none" stroke={stroke} strokeWidth={1.2} opacity={0.9} />
                  </g>
                );
              }}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
