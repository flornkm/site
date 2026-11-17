import type { ReactNode } from "react";
import type { LinearScale } from "./scale";

export const AXIS_TEXT = { fontSize: 11, fontVariantNumeric: "tabular-nums" } as const;
export const INK = "var(--text-primary, currentColor)";

export function YGrid({
  ticks,
  y,
  left,
  right,
}: {
  ticks: readonly number[];
  y: LinearScale;
  left: number;
  right: number;
}) {
  return (
    <g>
      {ticks.map((tick, i) => (
        <line
          key={tick}
          x1={left}
          x2={right}
          y1={y(tick)}
          y2={y(tick)}
          stroke={i === 0 ? "var(--chart-axis)" : "var(--chart-grid)"}
        />
      ))}
    </g>
  );
}

// Values sit on their own gridline, inside the plot, the way a printed chart labels its scale:
// no column of numbers down the left eating width. Drawn after the marks so nothing hides them.
// `gutter` puts them in a narrow column instead, for charts whose marks fill the left edge.
export function YLabels({
  ticks,
  y,
  left,
  format,
  gutter = true,
  skip = [],
}: {
  ticks: readonly number[];
  y: LinearScale;
  left: number;
  format: (value: number) => string;
  gutter?: boolean;
  // Values another label already names, such as a budget line sitting on a gridline.
  skip?: readonly number[];
}) {
  return (
    <g>
      {ticks.map((tick, i) =>
        (gutter ? i === 0 : i === 0 || skip.includes(tick)) ? null : (
          <text
            key={tick}
            x={gutter ? left - 8 : left}
            y={gutter ? y(tick) : y(tick) - 5}
            dy={gutter ? "0.32em" : undefined}
            textAnchor={gutter ? "end" : "start"}
            fill="var(--chart-ink)"
            style={gutter ? undefined : HALO}
          >
            {format(tick)}
          </text>
        ),
      )}
    </g>
  );
}

const HALO = {
  stroke: "var(--chart-surface)",
  strokeWidth: 4,
  strokeLinejoin: "round",
  paintOrder: "stroke",
} as const;

// Edge labels hug the plot instead of hanging off it.
export function anchorFor(x: number, left: number, right: number) {
  if (x - left < 22) return "start" as const;
  if (right - x < 22) return "end" as const;
  return "middle" as const;
}

export function XLabel({
  x,
  y,
  children,
  strong = false,
  anchor = "middle",
}: {
  x: number;
  y: number;
  children: ReactNode;
  strong?: boolean;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text
      x={x}
      y={y}
      dy="0.32em"
      textAnchor={anchor}
      fill={strong ? INK : "var(--chart-ink)"}
      className={strong ? "font-medium" : undefined}
    >
      {children}
    </text>
  );
}

// A quiet note on the chart itself, next to the thing it explains.
export function Note({
  x,
  y,
  anchor = "start",
  children,
}: {
  x: number;
  y: number;
  anchor?: "start" | "middle" | "end";
  children: ReactNode;
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} fill="var(--chart-ink)" style={HALO}>
      {children}
    </text>
  );
}

// A series named where it ends, instead of in a legend box above the chart.
export function SeriesLabel({
  x,
  y,
  anchor = "start",
  dimmed = 1,
  onHover,
  children,
}: {
  x: number;
  y: number;
  anchor?: "start" | "end";
  dimmed?: number;
  onHover?: (hovering: boolean) => void;
  children: ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      dy="0.32em"
      textAnchor={anchor}
      fill="var(--text-secondary, currentColor)"
      className="font-medium"
      onPointerEnter={() => onHover?.(true)}
      onPointerLeave={() => onHover?.(false)}
      style={{ ...HALO, opacity: dimmed, transition: "opacity 200ms ease-out" }}
    >
      {children}
    </text>
  );
}
