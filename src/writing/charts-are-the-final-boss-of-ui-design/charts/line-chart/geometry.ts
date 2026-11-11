import { monotonePath } from "../core/curve";
import { linePath, type Point } from "../core/path";
import { axisTicks, scaleLinear } from "../core/scale";
import type { Series } from "../core/series";
import { DAY, toTime } from "../core/time";

export type LinePoint = { date: string; values: Record<string, number | null | undefined> };
export type Limit = { value: number; label: string };

export const MARGIN = { top: 6, right: 4, bottom: 22, left: 40 };
const MIN_LABEL_GAP = 76;
const RATE_WINDOW = 7;

export type LineGeometry = ReturnType<typeof layoutLines>;

const valueOf = (point: LinePoint, key: string) => {
  const value = point.values[key];
  return typeof value === "number" ? value : null;
};

// The primary series carried forward at its recent daily rate, and the day it crosses the limit.
function project(points: readonly LinePoint[], key: string, end: number, limit?: Limit) {
  let last = -1;
  points.forEach((point, i) => {
    if (valueOf(point, key) !== null) last = i;
  });
  if (last < 1) return null;
  const from = Math.max(0, last - RATE_WINDOW);
  const lastValue = valueOf(points[last], key) ?? 0;
  const days = (toTime(points[last].date) - toTime(points[from].date)) / DAY;
  const rate = days > 0 ? (lastValue - (valueOf(points[from], key) ?? 0)) / days : 0;
  const start = toTime(points[last].date);
  const at = (time: number) => lastValue + rate * ((time - start) / DAY);
  const crossing =
    limit && rate > 0 && lastValue < limit.value
      ? start + ((limit.value - lastValue) / rate) * DAY
      : null;
  return { index: last, start, end, rate, at, endValue: at(end), crossing };
}

export function layoutLines({
  points,
  series,
  limit,
  forecastTo,
  width,
  height,
}: {
  points: readonly LinePoint[];
  series: readonly Series[];
  limit?: Limit;
  forecastTo?: string;
  width: number;
  height: number;
}) {
  const plot = {
    left: MARGIN.left,
    right: width - MARGIN.right,
    top: MARGIN.top,
    bottom: height - MARGIN.bottom,
  };
  const times = points.map((point) => toTime(point.date));
  const start = times[0];
  const end = Math.max(times[times.length - 1], forecastTo ? toTime(forecastTo) : 0);
  const primary = series[0]?.key;
  const forecast = forecastTo && primary ? project(points, primary, end, limit) : null;

  const values = points.flatMap((point) =>
    series.map((s) => valueOf(point, s.key)).filter((v): v is number => v !== null),
  );
  const { top, ticks } = axisTicks(
    Math.max(...values, forecast?.endValue ?? 0, limit?.value ?? 0, 1),
  );
  const x = scaleLinear([start, end], [plot.left, plot.right]);
  const y = scaleLinear([0, top], [plot.bottom, plot.top]);

  // Each series draws only where it has data, so this month stops at today.
  const lines = series.map((s) => {
    const pts: Point[] = [];
    points.forEach((point, i) => {
      const value = valueOf(point, s.key);
      if (value !== null) pts.push([x(times[i]), y(value)]);
    });
    return { key: s.key, color: s.color, d: monotonePath(pts), last: pts[pts.length - 1] };
  });

  const todayX = forecast ? x(forecast.start) : null;
  const dayWidth = x(start + DAY) - x(start);
  const stride = Math.max(1, Math.ceil(MIN_LABEL_GAP / dayWidth));
  const xTicks: { time: number; x: number }[] = [];
  for (let time = start; time <= end; time += DAY * stride) {
    const tickX = x(time);
    if (tickX + 18 > width) break;
    if (todayX !== null && Math.abs(tickX - todayX) < 46) continue;
    xTicks.push({ time, x: tickX });
  }

  const projection = forecast && {
    ...forecast,
    d: linePath([
      [x(forecast.start), y(forecast.at(forecast.start))],
      [x(end), y(forecast.endValue)],
    ]),
    crossingPoint:
      forecast.crossing && forecast.crossing <= end && limit
        ? ([x(forecast.crossing), y(limit.value)] as Point)
        : null,
  };

  return {
    plot,
    x,
    y,
    ticks,
    times,
    xTicks,
    lines,
    todayX,
    projection,
    limitY: limit ? y(limit.value) : null,
  };
}

export function pickNearestTime(geometry: LineGeometry, px: number) {
  const time = geometry.x.invert(px);
  let best = 0;
  geometry.times.forEach((t, i) => {
    if (Math.abs(t - time) < Math.abs(geometry.times[best] - time)) best = i;
  });
  return best;
}
