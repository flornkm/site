import type { ReactNode } from "react";
import { useWidth } from "../charts/core/use-width";

// The "before" charts: what a chart library's defaults look like when nobody touches them.
// Hard-coded library colours and fonts on purpose, so none of the post's theme leaks in.
export const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
export const INK = "#666";
export const GRID = "rgba(0,0,0,0.1)";

type Rgb = readonly [number, number, number];

export const CJS = {
  blue: [54, 162, 235],
  red: [255, 99, 132],
  teal: [75, 192, 192],
  orange: [255, 159, 64],
  purple: [153, 102, 255],
  yellow: [255, 205, 86],
  grey: [201, 203, 207],
} as const satisfies Record<string, Rgb>;

export const rgb = ([r, g, b]: Rgb, alpha = 1) => `rgba(${r},${g},${b},${alpha})`;

export const textWidth = (text: string, size = 12) => text.length * size * 0.56;

export function CheapFrame({
  height,
  label,
  children,
}: {
  height: number | ((width: number) => number);
  label: string;
  children: (width: number, height: number) => ReactNode;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const h = typeof height === "function" ? height(width) : height;
  return (
    <div ref={ref} className="w-full" style={{ height: h || undefined }}>
      {width > 0 && (
        <svg
          width={width}
          height={h}
          role="img"
          aria-label={label}
          style={{ display: "block", overflow: "hidden", fontFamily: FONT, fontSize: 12 }}
        >
          {children(width, h)}
        </svg>
      )}
    </div>
  );
}

export type LegendItem = { label: string; stroke: string; fill: string };

const BOX = 40;
const GAP = 10;
const ROW = 22;

function legendRows(items: readonly LegendItem[], width: number) {
  const rows: { item: LegendItem; w: number }[][] = [[]];
  let line = 0;
  for (const item of items) {
    const w = BOX + 6 + textWidth(item.label);
    const row = rows[rows.length - 1];
    if (row.length > 0 && line + w > width - 20) {
      rows.push([]);
      line = 0;
    }
    rows[rows.length - 1].push({ item, w });
    line += w + GAP;
  }
  return rows;
}

export const legendHeight = (items: readonly LegendItem[], width: number) =>
  legendRows(items, width).length * ROW + 6;

// The 40×12 boxes, centred and wrapped, that sit on top of every chart by default.
export function Legend({ items, width }: { items: readonly LegendItem[]; width: number }) {
  return legendRows(items, width).map((row, r) => {
    const total = row.reduce((sum, { w }) => sum + w, 0) + GAP * (row.length - 1);
    let x = (width - total) / 2;
    return row.map(({ item, w }) => {
      const node = (
        <g key={item.label} transform={`translate(${x},${6 + r * ROW})`}>
          <rect width={BOX} height={12} fill={item.fill} stroke={item.stroke} strokeWidth={2} />
          <text x={BOX + 6} y={10.5} fill={INK}>
            {item.label}
          </text>
        </g>
      );
      x += w + GAP;
      return node;
    });
  });
}

type XY = { x: number; y: number };

// Cardinal spline with tension 0.4 and no monotone clamp, so it overshoots at every sharp turn.
export function spline(points: readonly XY[], tension = 0.4) {
  const controls = points.map((p, i) => {
    const prev = points[i - 1] ?? p;
    const next = points[i + 1] ?? p;
    const d01 = Math.hypot(p.x - prev.x, p.y - prev.y);
    const d12 = Math.hypot(next.x - p.x, next.y - p.y);
    const sum = d01 + d12 || 1;
    const fa = (tension * d01) / sum;
    const fb = (tension * d12) / sum;
    return {
      in: { x: p.x - fa * (next.x - prev.x), y: p.y - fa * (next.y - prev.y) },
      out: { x: p.x + fb * (next.x - prev.x), y: p.y + fb * (next.y - prev.y) },
    };
  });
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(points[0].x)},${f(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    const a = controls[i - 1].out;
    const b = controls[i].in;
    d += `C${f(a.x)},${f(a.y)} ${f(b.x)},${f(b.y)} ${f(points[i].x)},${f(points[i].y)}`;
  }
  return d;
}

// Ticks by repeated addition, so the float error ends up in the labels.
export function sloppyTicks(max: number, count: number) {
  const step = max / count;
  const ticks: number[] = [];
  for (let value = 0; value <= max + 1e-9; value += step) ticks.push(value);
  return ticks;
}
