import { motion, useInView, useReducedMotion } from "motion/react";
import { useId, useMemo, useRef } from "react";
import { AXIS_TEXT, SeriesLabel, XLabel, YGrid, YLabels, anchorFor } from "../core/axes";
import { ChartRoot } from "../core/chart-root";
import { EASE_OUT, IN_VIEW } from "../core/reveal";
import type { Series } from "../core/series";
import { formatDay, toTime } from "../core/time";
import { ChartTooltip, TooltipRow, TooltipTitle, glide } from "../core/tooltip";
import { useScrub } from "../core/use-scrub";
import { useWidth } from "../core/use-width";
import { layoutLines, pickNearestTime, type Limit, type LinePoint } from "./geometry";

export type { Limit, LinePoint };

export type LineChartProps = {
  points: readonly LinePoint[];
  // The first series is the one that matters: it gets the forecast and the limit.
  series: readonly Series[];
  limit?: Limit;
  forecastTo?: string;
  format?: (value: number) => string;
  axisFormat?: (value: number) => string;
  height?: number;
  label?: string;
  className?: string;
};

export function LineChart({
  points,
  series,
  limit,
  forecastTo,
  format = String,
  axisFormat = format,
  height = 240,
  label = "Line chart",
  className,
}: LineChartProps) {
  const id = useId();
  const reduceMotion = useReducedMotion();
  // Clip paths and masks never count as on screen themselves, so the reveal is keyed to the chart.
  const viewRef = useRef<HTMLDivElement>(null);
  const inView = useInView(viewRef, IN_VIEW);
  const [ref, width] = useWidth<HTMLDivElement>();
  const g = useMemo(
    () => (width > 0 ? layoutLines({ points, series, limit, forecastTo, width, height }) : null),
    [points, series, limit, forecastTo, width, height],
  );
  const scrub = useScrub({
    count: points.length,
    pick: (x) => (g ? pickNearestTime(g, x) : points.length - 1),
  });

  const point = points[scrub.index];
  const time = toTime(point.date);
  const primary = series[0];
  const projected = g?.projection && time > g.projection.start ? g.projection.at(time) : null;
  const rows = series.map((s) => {
    const value = point.values[s.key];
    if (typeof value === "number") return { s, value, projected: false };
    if (s.key === primary.key && projected !== null)
      return { s, value: projected, projected: true };
    return null;
  });
  const crossing = g?.projection?.crossing ?? null;
  const crossingPoint = g?.projection?.crossingPoint ?? null;
  const todayX = g?.todayX ?? g?.plot.right ?? 0;
  // The forecast only starts once the history has finished drawing, then runs at an even pace so
  // the over-budget ring can appear exactly as the dotted line reaches it.
  const PAST = 0.9;
  const AHEAD = 0.9;
  const crossingDelay =
    crossingPoint && g
      ? PAST + AHEAD * ((crossingPoint[0] - todayX) / Math.max(1, width - todayX))
      : PAST + AHEAD;

  const cx = g ? g.x(time) : 0;
  const tooltipY = g
    ? Math.max(0, Math.min(height - 100, (scrub.pointerY ?? g.plot.top + 30) - 40))
    : 0;

  return (
    <ChartRoot className={className}>
      <div ref={viewRef}>
        <div
          ref={ref}
          {...scrub.props}
          aria-label={label}
          aria-valuetext={`${formatDay(time)}: ${rows
            .filter((row) => row !== null)
            .map((row) => `${row.s.label} ${format(row.value)}${row.projected ? " projected" : ""}`)
            .join(", ")}.`}
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
                <defs>
                  <clipPath id={`${id}-past`}>
                    <motion.rect
                      x={0}
                      y={0}
                      height={height}
                      initial={{ width: 0 }}
                      animate={{ width: inView ? todayX + 4 : 0 }}
                      transition={{ duration: PAST, ease: EASE_OUT }}
                    />
                  </clipPath>
                  <clipPath id={`${id}-all`}>
                    <motion.rect
                      x={0}
                      y={0}
                      height={height}
                      initial={{ width: 0 }}
                      animate={{ width: inView ? width : 0 }}
                      transition={{ duration: 1.4, ease: EASE_OUT }}
                    />
                  </clipPath>
                  <clipPath id={`${id}-ahead`}>
                    <motion.rect
                      x={todayX}
                      y={0}
                      height={height}
                      initial={{ width: 0 }}
                      animate={{ width: inView ? Math.max(0, width - todayX) : 0 }}
                      transition={{ duration: AHEAD, delay: PAST, ease: "linear" }}
                    />
                  </clipPath>
                </defs>

                <YGrid ticks={g.ticks} y={g.y} left={g.plot.left} right={g.plot.right} />
                {g.xTicks.map((tick) => (
                  <XLabel
                    key={tick.time}
                    x={tick.x}
                    y={g.plot.bottom + 14}
                    anchor={anchorFor(tick.x, g.plot.left, g.plot.right)}
                  >
                    {formatDay(tick.time)}
                  </XLabel>
                ))}
                {g.todayX !== null && (
                  <XLabel x={g.todayX} y={g.plot.bottom + 14} strong>
                    Today
                  </XLabel>
                )}

                {limit && g.limitY !== null && (
                  <g>
                    <line
                      x1={g.plot.left}
                      x2={g.plot.right}
                      y1={g.limitY}
                      y2={g.limitY}
                      stroke="var(--chart-target)"
                      strokeOpacity={0.6}
                    />
                  </g>
                )}

                <g clipPath={`url(#${id}-all)`}>
                  {g.lines.slice(1).map((line) => (
                    <path
                      key={line.key}
                      d={line.d}
                      fill="none"
                      stroke={line.color}
                      strokeWidth={1.75}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </g>
                {g.projection && (
                  <g clipPath={`url(#${id}-ahead)`}>
                    <path
                      d={g.projection.d}
                      fill="none"
                      stroke={primary.color}
                      strokeOpacity={0.75}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeDasharray="0 5"
                    />
                  </g>
                )}
                <g clipPath={`url(#${id}-past)`}>
                  <path
                    d={g.lines[0].d}
                    fill="none"
                    stroke={primary.color}
                    strokeWidth={2.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>

                {g.lines[0].last && (
                  <motion.circle
                    cx={g.lines[0].last[0]}
                    cy={g.lines[0].last[1]}
                    r={4}
                    fill={primary.color}
                    stroke="var(--chart-surface)"
                    strokeWidth={2}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
                    transition={{ duration: 0.35, delay: PAST - 0.1, ease: EASE_OUT }}
                  />
                )}

                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: inView ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: PAST, ease: EASE_OUT }}
                >
                  {g.lines.map((line, i) =>
                    line.last ? (
                      <SeriesLabel
                        key={line.key}
                        x={i === 0 ? line.last[0] - 10 : line.last[0]}
                        y={i === 0 ? line.last[1] - 14 : line.last[1] + 14}
                        anchor="end"
                      >
                        {series[i].label}
                      </SeriesLabel>
                    ) : null,
                  )}
                </motion.g>
                {crossingPoint && crossing && (
                  <motion.g
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
                    transition={{ duration: 0.3, delay: crossingDelay, ease: EASE_OUT }}
                    style={{ transformOrigin: `${crossingPoint[0]}px ${crossingPoint[1]}px` }}
                  >
                    <circle
                      cx={crossingPoint[0]}
                      cy={crossingPoint[1]}
                      r={3.5}
                      fill="var(--chart-surface)"
                      stroke="var(--chart-target)"
                      strokeWidth={1.75}
                    />
                  </motion.g>
                )}

                <YLabels ticks={g.ticks} y={g.y} left={g.plot.left} format={axisFormat} />

                <line
                  x1={0}
                  x2={0}
                  y1={g.plot.top}
                  y2={g.plot.bottom}
                  stroke="var(--chart-axis)"
                  strokeLinecap="round"
                  style={{
                    transform: `translateX(${cx}px)`,
                    opacity: scrub.visible ? 1 : 0,
                    transition: glide(reduceMotion),
                  }}
                />
                {rows.map(
                  (row) =>
                    row && (
                      <circle
                        key={row.s.key}
                        r={4}
                        fill={row.projected ? "var(--chart-surface)" : row.s.color}
                        stroke={row.projected ? row.s.color : "var(--chart-surface)"}
                        strokeWidth={2}
                        style={{
                          transform: `translate(${cx}px, ${g.y(row.value)}px)`,
                          opacity: scrub.visible ? 1 : 0,
                          transition: glide(reduceMotion),
                        }}
                      />
                    ),
                )}
              </svg>
              <ChartTooltip x={cx} y={tooltipY} bounds={width} visible={scrub.visible}>
                <TooltipTitle>{formatDay(time)}</TooltipTitle>
                {rows.map(
                  (row) =>
                    row && (
                      <TooltipRow
                        key={row.s.key}
                        color={row.s.color}
                        label={row.projected ? `${row.s.label}, projected` : row.s.label}
                        value={format(row.value)}
                      />
                    ),
                )}
              </ChartTooltip>
            </>
          )}
        </div>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <th scope="row">{p.date}</th>
              {series.map((s) => {
                const value = p.values[s.key];
                return <td key={s.key}>{typeof value === "number" ? format(value) : "–"}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </ChartRoot>
  );
}
