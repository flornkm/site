import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { AXIS_TEXT, SeriesLabel, XLabel, YGrid, YLabels, anchorFor } from "../core/axes";
import { ChartRoot } from "../core/chart-root";
import { EASE_OUT, IN_VIEW, reveal } from "../core/reveal";
import { SeriesKey } from "../core/key";
import { dimmed, spread } from "../core/labels";
import type { Series } from "../core/series";
import { ChartTooltip, TooltipRow, glide } from "../core/tooltip";
import { useScrub } from "../core/use-scrub";
import { useWidth } from "../core/use-width";
import { layoutScatter, pickNearest, type ScatterPoint } from "./geometry";

export type { ScatterPoint };

export type ScatterChartProps = {
  points: readonly ScatterPoint[];
  series: readonly Series[];
  xLabel: string;
  yLabel: string;
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
  height?: number;
  label?: string;
  className?: string;
};

const TOOLTIP_HEIGHT = 120;
// Below the dot in the top half, above it in the bottom half, so it never runs off the chart.
const tooltipY = (cy: number, height: number) =>
  Math.max(
    0,
    Math.min(height - TOOLTIP_HEIGHT, cy > height / 2 ? cy - TOOLTIP_HEIGHT + 16 : cy - 16),
  );

export function ScatterChart({
  points,
  series,
  xLabel,
  yLabel,
  formatX = String,
  formatY = String,
  height = 280,
  label = "Scatter chart",
  className,
}: ScatterChartProps) {
  const reduceMotion = useReducedMotion();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const g = useMemo(
    () => (width > 0 ? layoutScatter({ points, series, width, height }) : null),
    [points, series, width, height],
  );
  const scrub = useScrub({
    count: points.length,
    pick: (x, y) => (g ? pickNearest(g, x, y) : null),
  });

  const dot = g?.dots[scrub.index];
  const active = dot?.point;
  const activeSeries = series.find((s) => s.key === active?.series);
  const labels = g
    ? spread(
        g.trends.map((trend) => ({
          key: trend.key,
          y: trend.to[1],
          label: series.find((s) => s.key === trend.key)?.label ?? trend.key,
        })),
      )
    : [];

  return (
    <ChartRoot className={className}>
      <div
        ref={ref}
        {...scrub.props}
        aria-label={label}
        aria-valuetext={
          active
            ? `${activeSeries?.label ?? ""} ${active.id}: ${xLabel} ${formatX(active.x)}, ${yLabel} ${formatY(active.y)}.`
            : ""
        }
        style={{ height }}
        className="relative cursor-crosshair touch-pan-y rounded-md outline-none focus-visible:ring-2 focus-visible:ring-default"
      >
        {g && (
          <>
            <svg
              aria-hidden
              width={width}
              height={height}
              className="absolute inset-0 overflow-visible"
              style={AXIS_TEXT}
            >
              <YGrid ticks={g.yTicks} y={g.y} left={g.plot.left} right={g.plot.right} />
              {g.xTicks.map((tick) => (
                <XLabel
                  key={tick.value}
                  x={tick.x}
                  y={g.plot.bottom + 14}
                  anchor={anchorFor(tick.x, g.plot.left, g.plot.right)}
                >
                  {formatX(tick.value)}
                </XLabel>
              ))}

              {dot && (
                <g
                  stroke="var(--chart-axis)"
                  strokeDasharray="0.5 4"
                  strokeLinecap="round"
                  style={{ opacity: scrub.visible ? 1 : 0, transition: "opacity 150ms ease-out" }}
                >
                  <line x1={dot.cx} x2={dot.cx} y1={dot.cy + 8} y2={g.plot.bottom} />
                  <line x1={g.plot.left} x2={dot.cx - 8} y1={dot.cy} y2={dot.cy} />
                </g>
              )}

              {g.dots.map((d, i) => (
                <motion.circle
                  key={d.point.id}
                  cx={d.cx}
                  cy={d.cy}
                  r={3}
                  fill={d.color}
                  stroke="var(--chart-surface)"
                  strokeWidth={1}
                  initial={{ scale: 0.3 }}
                  whileInView={{ scale: 1 }}
                  viewport={IN_VIEW}
                  transition={{
                    duration: 0.4,
                    delay: (d.cx / Math.max(width, 1)) * 0.6,
                    ease: EASE_OUT,
                  }}
                  style={{
                    opacity:
                      dimmed(highlighted, d.point.series) *
                      (scrub.visible && i !== scrub.index ? 0.4 : 0.8),
                    transition: "opacity 160ms ease-out",
                  }}
                />
              ))}

              <g>
                {g.trends.map((trend) => (
                  <motion.line
                    key={trend.key}
                    x1={trend.from[0]}
                    y1={trend.from[1]}
                    x2={trend.to[0]}
                    y2={trend.to[1]}
                    stroke={trend.color}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={IN_VIEW}
                    transition={{ duration: 0.7, delay: 0.6, ease: EASE_OUT }}
                    style={{
                      opacity: dimmed(highlighted, trend.key),
                      transition: "opacity 200ms ease-out",
                    }}
                  />
                ))}
                <motion.g {...reveal(1)}>
                  {labels.map((item) => (
                    <SeriesLabel
                      key={item.key}
                      x={g.plot.right + 8}
                      y={item.y}
                      dimmed={dimmed(highlighted, item.key)}
                      onHover={(hovering) => setHighlighted(hovering ? item.key : null)}
                    >
                      {item.label}
                    </SeriesLabel>
                  ))}
                </motion.g>
              </g>

              <YLabels ticks={g.yTicks} y={g.y} left={g.plot.left} format={formatY} />
              {/* One ring that glides from dot to dot instead of each dot growing on its own. */}
              {dot && (
                <circle
                  r={6}
                  fill={dot.color}
                  stroke="var(--chart-surface)"
                  strokeWidth={2}
                  style={{
                    transform: `translate(${dot.cx}px, ${dot.cy}px)`,
                    opacity: scrub.visible ? 1 : 0,
                    transition: glide(reduceMotion),
                  }}
                />
              )}
            </svg>
            {dot && active && (
              <ChartTooltip
                x={dot.cx + 4}
                y={tooltipY(dot.cy, height)}
                bounds={width}
                visible={scrub.visible}
              >
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium">
                  {activeSeries && <SeriesKey color={activeSeries.color} />}
                  <span className="text-primary">{activeSeries?.label}</span>
                </div>
                <TooltipRow label={xLabel} value={formatX(active.x)} />
                <TooltipRow label={yLabel} value={formatY(active.y)} />
                {active.details?.map(([name, value]) => (
                  <TooltipRow key={name} label={name} value={value} />
                ))}
              </ChartTooltip>
            )}
          </>
        )}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Point</th>
            <th scope="col">{xLabel}</th>
            <th scope="col">{yLabel}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.id}>
              <th scope="row">{p.id}</th>
              <td>{formatX(p.x)}</td>
              <td>{formatY(p.y)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ChartRoot>
  );
}
