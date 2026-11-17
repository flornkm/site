import { useId, type CSSProperties } from "react";

type Point = readonly [number, number];
type Part =
  | { kind: "text" | "box"; x: number; y: number; w: number; h: number }
  | { kind: "dots"; points: Point[]; y: number };

export type BlueprintData = { id: number; width: number; height: number; parts: Part[] };

const DOT_STEP = 6;
const MAX_DOTS = 1800;
const SMALL_BOX = 14;

const isHidden = (el: Element, stop: Element) => {
  for (let node: Element | null = el; node && node !== stop; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.opacity === "0" || style.visibility === "hidden" || style.display === "none")
      return true;
  }
  return false;
};

let nextId = 0;

// Reads the improved card as it is laid out right now and turns every element into a part of a
// technical drawing: text becomes a bar, rects a dotted outline, lines and arcs a row of dots
// along their real path. Coordinates are relative to the cell, so it lines up at any width.
export function measureBlueprint(cell: HTMLElement, layer: HTMLElement): BlueprintData {
  const origin = cell.getBoundingClientRect();
  const parts: Part[] = [];
  const box = (r: DOMRect) => ({
    x: r.left - origin.left,
    y: r.top - origin.top,
    w: r.width,
    h: r.height,
  });

  const range = document.createRange();
  layer.querySelectorAll("header h3, header p").forEach((el) => {
    range.selectNodeContents(el);
    parts.push({ kind: "text", ...box(range.getBoundingClientRect()) });
  });

  const geometry: SVGGeometryElement[] = [];
  layer.querySelectorAll("svg").forEach((svg) => {
    svg.querySelectorAll("text, rect, circle, path, line").forEach((el) => {
      if (el.closest("defs, clipPath, mask") || isHidden(el, layer)) return;
      const b = box(el.getBoundingClientRect());
      if (b.w < 0.5 && b.h < 0.5) return;
      if (el.tagName === "text") parts.push({ kind: "text", ...b });
      else if (el.tagName === "rect" && b.w >= SMALL_BOX && b.h >= 2)
        parts.push({ kind: "box", ...b });
      else if (el.tagName === "rect" || el.tagName === "circle")
        parts.push({ kind: "dots", points: [[b.x + b.w / 2, b.y + b.h / 2]], y: b.y });
      else geometry.push(el as SVGGeometryElement);
    });
  });

  const total = geometry.reduce((sum, el) => sum + el.getTotalLength(), 0);
  const step = Math.max(DOT_STEP, total / MAX_DOTS);
  for (const el of geometry) {
    const matrix = el.getScreenCTM();
    if (!matrix) continue;
    const length = el.getTotalLength();
    const points: Point[] = [];
    for (let t = 0; t <= length; t += step) {
      const p = el.getPointAtLength(t).matrixTransform(matrix);
      points.push([p.x - origin.left, p.y - origin.top]);
    }
    if (points.length)
      parts.push({ kind: "dots", points, y: Math.min(...points.map((p) => p[1])) });
  }

  return {
    id: ++nextId,
    width: Math.round(origin.width),
    height: Math.round(origin.height),
    parts,
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const dotsPath = (points: readonly Point[]) =>
  points.map(([x, y]) => `M${r1(x)},${r1(y)}h0`).join("");

export function Blueprint({ data, build }: { data: BlueprintData; build: number }) {
  const id = useId();
  const { width: w, height: h, parts } = data;
  // The first mark with real extent gets a coordinate readout, like a cursor parked on it.
  const anchor = parts.find((p) => p.kind === "box") ?? parts.find((p) => p.kind === "dots");
  const ax = anchor ? (anchor.kind === "dots" ? anchor.points[0][0] : anchor.x) : 0;
  const ay = anchor ? (anchor.kind === "dots" ? anchor.points[0][1] : anchor.y) : 0;
  const delay = (y: number): CSSProperties => ({
    animationDelay: `${Math.round((Math.max(0, y) / Math.max(1, h)) * build * 0.45)}ms`,
  });
  const corners: Point[] = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ];

  return (
    <svg
      aria-hidden
      className="before-after-blueprint"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ "--build": `${build}ms` } as CSSProperties}
    >
      <defs>
        <pattern id={`${id}-grid`} width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="6" r="0.7" fill="currentColor" />
        </pattern>
      </defs>
      <rect width={w} height={h} rx="16" fill={`url(#${id}-grid)`} className="bp-grid" />
      <rect
        x="0.75"
        y="0.75"
        width={w - 1.5}
        height={h - 1.5}
        rx="16"
        className="bp-frame"
        fill="none"
      />
      {corners.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x - 3} y={y - 3} width="6" height="6" className="bp-corner" />
      ))}

      {parts.map((part, i) =>
        part.kind === "dots" ? (
          <path
            key={i}
            d={dotsPath(part.points)}
            className="bp-part bp-dots"
            style={delay(part.y)}
          />
        ) : part.kind === "box" ? (
          <rect
            key={i}
            x={part.x + 0.5}
            y={part.y + 0.5}
            width={Math.max(0, part.w - 1)}
            height={Math.max(0, part.h - 1)}
            rx="2"
            className="bp-part bp-box"
            style={delay(part.y)}
          />
        ) : (
          <rect
            key={i}
            x={part.x}
            y={part.y + part.h * 0.22}
            width={part.w}
            height={part.h * 0.56}
            rx="2"
            className="bp-part bp-text"
            style={delay(part.y)}
          />
        ),
      )}

      {anchor && (
        <g className="bp-part bp-readout" style={delay(ay)}>
          <path d={`M${r1(ax - 30)},${r1(ay)}h${30}`} className="bp-leader" />
          <text x={ax + 6} y={ay - 6}>
            {String(Math.round(ax)).padStart(3, "0")}·{String(Math.round(ay)).padStart(3, "0")}
          </text>
        </g>
      )}
      <text x={w - 12} y={h - 10} textAnchor="end" className="bp-label">
        {w} × {h} · PARTS {String(parts.length).padStart(2, "0")}
      </text>
      <line x1="0" x2={w} y1="0" y2="0" className="bp-scan" />
    </svg>
  );
}
