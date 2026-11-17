export type Point = readonly [x: number, y: number];

const round = (n: number) => Math.round(n * 100) / 100;

export const linePath = (points: readonly Point[]) =>
  points.map(([x, y], i) => `${i ? "L" : "M"}${round(x)},${round(y)}`).join("");

export function areaPath(points: readonly Point[], baseline: number) {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)}L${round(last[0])},${round(baseline)}L${round(first[0])},${round(baseline)}Z`;
}
