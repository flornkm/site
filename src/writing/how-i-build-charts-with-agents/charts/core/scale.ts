export type LinearScale = {
  (value: number): number;
  invert: (pixel: number) => number;
};

export function scaleLinear(
  [d0, d1]: readonly [number, number],
  [r0, r1]: readonly [number, number],
): LinearScale {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  const scale = ((value: number) => r0 + (value - d0) * k) as LinearScale;
  scale.invert = (pixel) => (k === 0 ? d0 : d0 + (pixel - r0) / k);
  return scale;
}

// The round step (1, 2, 5 × 10ⁿ) closest to `raw`. No 2.5: most chart data is counted, not measured.
export function niceStep(raw: number) {
  if (raw <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const steps = [1, 2, 5, 10].map((m) => m * power);
  return steps.reduce((best, s) => (Math.abs(s - raw) < Math.abs(best - raw) ? s : best));
}

// Gridline values from zero to just above `max`, a little headroom so the tallest mark never
// touches the top edge.
export function axisTicks(max: number, count = 4, headroom = 1.08) {
  const top = Math.max(max, Number.EPSILON) * headroom;
  const step = niceStep(max / count);
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) =>
    Number((i * step).toFixed(6)),
  );
  return { top, ticks };
}
