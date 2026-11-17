import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { AXIS_TEXT, SeriesLabel, XLabel, YGrid, YLabels, anchorFor } from "../core/axes";
import { ChartRoot } from "../core/chart-root";
import { EASE_OUT, IN_VIEW, reveal } from "../core/reveal";
import { dimmed, spread } from "../core/labels";
import type { Series } from "../core/series";
import { formatDay } from "../core/time";
import { ChartTooltip, TooltipRow, TooltipTitle } from "../core/tooltip";
import { useScrub } from "../core/use-scrub";
import { useWidth } from "../core/use-width";
import { layoutBars, pickBar, type Bucket } from "./geometry";

export type { Bucket };

export type BarChartProps = {
  buckets: readonly Bucket[];
  series: readonly Series[];
  format?: (value: number) => string;
  axisFormat?: (value: number) => string;
  height?: number;
  label?: string;
  className?: string;
};

export function BarChart({
  buckets,
  series,
  format = String,
  axisFormat = format,
  height = 220,
  label = "Bar chart",
  className,
}: BarChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const g = useMemo(
    () => (width > 0 ? layoutBars({ buckets, series, width, height }) : null),
    [buckets, series, width, height],
  );
  const scrub = useScrub({
    count: buckets.length,
    pick: (x) => (g ? pickBar(g, x) : buckets.length - 1),
  });

  const bucket = buckets[scrub.index];
  const total = series.reduce((sum, s) => sum + (bucket.values[s.key] ?? 0), 0);
  const title = formatDay(g?.bars[scrub.index].time ?? Date.parse(`${bucket.date}T00:00:00Z`));
  const activeX = g?.bars[scrub.index].center ?? 0;
  const tooltipY = g
    ? Math.max(0, Math.min(height - 130, (scrub.pointerY ?? g.plot.top + 20) - 40))
    : 0;

  // The series are named beside the last bar, level with their own segment.
  const lastBar = g?.bars[g.bars.length - 1];
  const labels = lastBar
    ? spread(
        lastBar.segments.map((segment) => ({
          key: segment.key,
          y: segment.mid,
          label: series.find((s) => s.key === segment.key)?.label ?? segment.key,
        })),
      )
    : [];

  return (
    <ChartRoot className={className}>
      <div
        ref={ref}
        {...scrub.props}
        aria-label={label}
        aria-valuetext={`${title}: ${series.map((s) => `${s.label} ${format(bucket.values[s.key] ?? 0)}`).join(", ")}.`}
        style={{ height }}
        className="relative touch-pan-y rounded-md outline-none focus-visible:ring-2 focus-visible:ring-default"
      >
        {g && lastBar && (
          <>
            <svg
              aria-hidden
              width={width}
              height={height}
              className="absolute inset-0 overflow-visible"
              style={AXIS_TEXT}
            >
              <YGrid ticks={g.yTicks} y={g.y} left={g.plot.left} right={g.plot.right} />

              {g.bars.map((bar, i) => (
                <g key={bar.time}>
                  <motion.g
                    style={{ originY: 1, transformBox: "fill-box" }}
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={IN_VIEW}
                    transition={{ duration: 0.6, delay: i * 0.025, ease: EASE_OUT }}
                  >
                    {bar.segments.map((segment) => (
                      <path
                        key={segment.key}
                        d={segment.d}
                        fill={segment.color}
                        style={{
                          opacity:
                            dimmed(highlighted, segment.key) *
                            (scrub.visible && i !== scrub.index ? 0.4 : 1),
                          transition: "opacity 120ms ease-out",
                        }}
                      />
                    ))}
                  </motion.g>
                  {bar.showLabel && (
                    <XLabel
                      x={bar.center}
                      y={g.plot.bottom + 14}
                      anchor={anchorFor(bar.center, g.plot.left, g.plot.right)}
                    >
                      {formatDay(bar.time)}
                    </XLabel>
                  )}
                </g>
              ))}

              <YLabels ticks={g.yTicks} y={g.y} left={g.plot.left} format={axisFormat} gutter />
              <motion.g {...reveal(0.55)}>
                {labels.map((item) => (
                  <SeriesLabel
                    key={item.key}
                    x={lastBar.right + 8}
                    y={item.y}
                    dimmed={dimmed(highlighted, item.key)}
                    onHover={(hovering) => setHighlighted(hovering ? item.key : null)}
                  >
                    {item.label}
                  </SeriesLabel>
                ))}
              </motion.g>
            </svg>
            <ChartTooltip
              x={activeX + Math.min(g.band / 2 - 4, 14)}
              y={tooltipY}
              bounds={width}
              visible={scrub.visible}
            >
              <TooltipTitle>{title}</TooltipTitle>
              {series.map((s) => (
                <TooltipRow
                  key={s.key}
                  color={s.color}
                  label={s.label}
                  value={format(bucket.values[s.key] ?? 0)}
                />
              ))}
              <div className="mt-1.5 border-t border-primary pt-1.5">
                <TooltipRow label="Total" value={format(total)} />
              </div>
            </ChartTooltip>
          </>
        )}
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
          {buckets.map((b) => (
            <tr key={b.date}>
              <th scope="row">{b.date}</th>
              {series.map((s) => (
                <td key={s.key}>{format(b.values[s.key] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ChartRoot>
  );
}
