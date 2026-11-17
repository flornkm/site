import { axisTicks, scaleLinear } from "../core/scale";
import type { Series } from "../core/series";

export type ScatterPoint = {
  id: string;
  series: string;
  x: number;
  y: number;
  // Extra rows for the tooltip, already formatted.
  details?: readonly (readonly [label: string, value: string])[];
};

export const MARGIN = { top: 6, right: 60, bottom: 22, left: 32 };
const MIN_LABEL_GAP = 64;
// The pointer only has to be closest, not on the dot: anything within this many pixels counts.
const REACH = 28;

export type ScatterGeometry = ReturnType<typeof layoutScatter>;

export function layoutScatter({
  points,
  series,
  width,
  height,
}: {
  points: readonly ScatterPoint[];
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
  // Left to right, so the arrow keys walk the dots in reading order.
  const ordered = [...points].sort((a, b) => a.x - b.x);
  const xAxis = axisTicks(Math.max(...ordered.map((p) => p.x), 1), 5, 1.04);
  const yAxis = axisTicks(Math.max(...ordered.map((p) => p.y), 1));
  const x = scaleLinear([0, xAxis.top], [plot.left, plot.right]);
  const y = scaleLinear([0, yAxis.top], [plot.bottom, plot.top]);

  // Thin the x labels out until they have room to breathe.
  const spacing = x(xAxis.ticks[1] ?? 1) - x(0);
  const stride = Math.max(1, Math.ceil(MIN_LABEL_GAP / Math.max(spacing, 1)));
  const xTicks = xAxis.ticks
    .filter((_, i) => i % stride === 0)
    .map((value) => ({ value, x: x(value) }))
    .filter((tick) => tick.x + 16 <= width);

  const colorOf = new Map(series.map((s) => [s.key, s.color]));
  const dots = ordered.map((point) => ({
    point,
    cx: x(point.x),
    cy: y(point.y),
    color: colorOf.get(point.series) ?? "var(--chart-neutral)",
  }));

  // A least-squares line per series, drawn across the range that series actually covers.
  const trends = series.flatMap((s) => {
    const own = ordered.filter((p) => p.series === s.key);
    if (own.length < 2) return [];
    const mx = own.reduce((sum, p) => sum + p.x, 0) / own.length;
    const my = own.reduce((sum, p) => sum + p.y, 0) / own.length;
    const sxx = own.reduce((sum, p) => sum + (p.x - mx) ** 2, 0);
    const slope = sxx > 0 ? own.reduce((sum, p) => sum + (p.x - mx) * (p.y - my), 0) / sxx : 0;
    const at = (value: number) => Math.max(0, my + slope * (value - mx));
    const x1 = own[0].x;
    const x2 = own[own.length - 1].x;
    return [
      {
        key: s.key,
        color: s.color,
        from: [x(x1), y(at(x1))] as const,
        to: [x(x2), y(at(x2))] as const,
      },
    ];
  });

  return { plot, x, y, xTicks, yTicks: yAxis.ticks, dots, trends };
}

export function pickNearest(geometry: ScatterGeometry, px: number, py: number) {
  let best: number | null = null;
  let bestDistance = REACH * REACH;
  geometry.dots.forEach((dot, i) => {
    const distance = (dot.cx - px) ** 2 + (dot.cy - py) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  });
  return best;
}
