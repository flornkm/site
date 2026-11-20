import { linePath, type Point } from "./path";

const round = (n: number) => Math.round(n * 100) / 100;

// A smooth line through every point that never overshoots: between two points it stays within
// their values, so a cumulative count never appears to dip. Same idea as d3's curveMonotoneX.
export function monotonePath(points: readonly Point[]) {
  const n = points.length;
  if (n < 3) return linePath(points);

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1][0] - points[i][0];
    slope[i] = (points[i + 1][1] - points[i][1]) / dx[i];
  }

  const tangent: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    const a = slope[i - 1];
    const b = slope[i];
    tangent[i] =
      a * b <= 0
        ? 0
        : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / a + (dx[i] + 2 * dx[i - 1]) / b);
  }
  tangent[n - 1] = slope[n - 2];

  let d = `M${round(points[0][0])},${round(points[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const third = dx[i] / 3;
    d += `C${round(x0 + third)},${round(y0 + tangent[i] * third)},${round(x1 - third)},${round(y1 - tangent[i + 1] * third)},${round(x1)},${round(y1)}`;
  }
  return d;
}
