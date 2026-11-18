import { axisTicks, scaleLinear } from "../core/scale";
import { toTime } from "../core/time";
import type { Series } from "../core/series";

export type Bucket = { date: string; values: Record<string, number> };

export const MARGIN = { top: 6, right: 62, bottom: 22, left: 32 };
const MIN_LABEL_GAP = 56;
const MAX_BAR = 22;
const SEGMENT_GAP = 2;
const TOP_RADIUS = 4;
const INNER_RADIUS = 1;

export type BarGeometry = ReturnType<typeof layoutBars>;

// A rect with its own radius for the top and the bottom corners, clamped so small segments
// still close into a shape.
function roundedRect(
  x: number,
  y: number,
  width: number,
  height: number,
  top: number,
  bottom: number,
) {
  const t = Math.min(top, width / 2, height / 2);
  const b = Math.min(bottom, width / 2, height / 2);
  return [
    `M${x},${y + t}`,
    `A${t},${t} 0 0 1 ${x + t},${y}`,
    `H${x + width - t}`,
    `A${t},${t} 0 0 1 ${x + width},${y + t}`,
    `V${y + height - b}`,
    `A${b},${b} 0 0 1 ${x + width - b},${y + height}`,
    `H${x + b}`,
    `A${b},${b} 0 0 1 ${x},${y + height - b}`,
    "Z",
  ].join("");
}

export function layoutBars({
  buckets,
  series,
  width,
  height,
}: {
  buckets: readonly Bucket[];
  series: readonly Series[];
  width: number;
  height: number;
}) {
  const plot = {
    left: MARGIN.left,
    right: width - MARGIN.right,
    top: MARGIN.top,
    bottom: height - MARGIN.bottom,
  };
  const totals = buckets.map((bucket) =>
    series.reduce((sum, s) => sum + (bucket.values[s.key] ?? 0), 0),
  );
  const maxTotal = Math.max(...totals, 1);
  const average = totals.reduce((a, b) => a + b, 0) / totals.length;
  const { top: yTop, ticks: yTicks } = axisTicks(maxTotal);
  const y = scaleLinear([0, yTop], [plot.bottom, plot.top]);

  const band = (plot.right - plot.left) / buckets.length;
  const barWidth = Math.min(MAX_BAR, band * 0.66);
  const stride = Math.max(1, Math.ceil(MIN_LABEL_GAP / band));

  const bars = buckets.map((bucket, i) => {
    const center = plot.left + band * (i + 0.5);
    const left = center - barWidth / 2;
    let cumulative = 0;
    const present = series.filter((s) => (bucket.values[s.key] ?? 0) > 0);
    const segments = present.map((s, j) => {
      const value = bucket.values[s.key];
      const top = y(cumulative + value);
      // Every segment above the first gives up 2px at its foot, so stacked fills never touch.
      const bottom = y(cumulative) - (cumulative > 0 ? SEGMENT_GAP : 0);
      cumulative += value;
      const segmentHeight = Math.max(0, bottom - top);
      const isTop = j === present.length - 1;
      return {
        key: s.key,
        color: s.color,
        mid: top + segmentHeight / 2,
        d: roundedRect(
          left,
          top,
          barWidth,
          segmentHeight,
          isTop ? TOP_RADIUS : INNER_RADIUS,
          INNER_RADIUS,
        ),
      };
    });
    return {
      center,
      right: left + barWidth,
      time: toTime(bucket.date),
      total: totals[i],
      segments,
      showLabel: i % stride === 0,
    };
  });

  return { plot, y, yTicks, band, bars, average, averageY: y(average), totals };
}

export function pickBar(geometry: BarGeometry, x: number) {
  const { plot, band, bars } = geometry;
  return Math.max(0, Math.min(bars.length - 1, Math.floor((x - plot.left) / band)));
}
