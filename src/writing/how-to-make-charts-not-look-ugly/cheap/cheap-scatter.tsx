import { useId } from "react";
import type { ScatterPoint } from "../charts";
import { CJS, CheapFrame, GRID, INK, Legend, legendHeight, rgb } from "./kit";

const SERIES = [
  { key: "opus", label: "Opus", color: CJS.blue },
  { key: "sonnet", label: "Sonnet", color: CJS.red },
  { key: "haiku", label: "Haiku", color: CJS.orange },
];

const LEGEND = [
  ...SERIES.map((s) => ({ label: s.label, stroke: rgb(s.color), fill: rgb(s.color, 0.5) })),
  { label: "Trend", stroke: "rgba(0,0,0,0.6)", fill: "rgba(0,0,0,0.1)" },
];

const X_MAX = 160_000;
const Y_MAX = 3.5;
const X_TICKS = Array.from({ length: 9 }, (_, i) => i * 20_000);
const Y_TICKS = Array.from({ length: 8 }, (_, i) => i * 0.5);

// One least-squares line through every model at once.
function trend(points: readonly ScatterPoint[]) {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  const slope =
    points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) /
    points.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  return (x: number) => my + slope * (x - mx);
}

// A hard-coded y max that cuts the slowest requests in half, field names as axis titles, and a
// single trend line that averages three models into one meaningless slope.
export function CheapScatter({
  points,
  height,
  label,
}: {
  points: readonly ScatterPoint[];
  height: number;
  label: string;
}) {
  const clipId = useId();
  const fit = trend(points);

  return (
    <CheapFrame height={height} label={label}>
      {(width) => {
        const top = legendHeight(LEGEND, width) + 8;
        const left = 52;
        const right = width - 14;
        const bottom = height - 42;
        const x = (value: number) => left + (value / X_MAX) * (right - left);
        const y = (value: number) => bottom - (value / Y_MAX) * (bottom - top);

        return (
          <>
            <Legend items={LEGEND} width={width} />
            <clipPath id={clipId}>
              <rect x={left} y={top} width={right - left} height={bottom - top} />
            </clipPath>
            {Y_TICKS.map((tick) => (
              <g key={tick}>
                <line x1={left - 8} x2={right} y1={y(tick)} y2={y(tick)} stroke={GRID} />
                <text
                  x={left - 12}
                  y={y(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill={INK}
                >
                  {tick}
                </text>
              </g>
            ))}
            {X_TICKS.map((tick) => (
              <g key={tick}>
                <line x1={x(tick)} x2={x(tick)} y1={top} y2={bottom + 8} stroke={GRID} />
                <text x={x(tick)} y={bottom + 22} textAnchor="middle" fill={INK}>
                  {tick.toLocaleString("en-US")}
                </text>
              </g>
            ))}
            <text
              transform={`translate(10,${(top + bottom) / 2}) rotate(-90)`}
              textAnchor="middle"
              fill={INK}
            >
              ttft_seconds
            </text>
            <text x={(left + right) / 2} y={height - 2} textAnchor="middle" fill={INK}>
              prompt_tokens
            </text>
            <g clipPath={`url(#${CSS.escape(clipId)})`}>
              <line
                x1={x(0)}
                y1={y(fit(0))}
                x2={x(X_MAX)}
                y2={y(fit(X_MAX))}
                stroke="rgba(0,0,0,0.6)"
                strokeWidth={2}
                strokeDasharray="6 6"
              />
              {[...SERIES]
                .reverse()
                .map((series) =>
                  points
                    .filter((p) => p.series === series.key)
                    .map((p) => (
                      <circle
                        key={p.id}
                        cx={x(p.x)}
                        cy={y(p.y)}
                        r={3}
                        fill={rgb(series.color, 0.5)}
                        stroke={rgb(series.color)}
                      />
                    )),
                )}
            </g>
          </>
        );
      }}
    </CheapFrame>
  );
}
