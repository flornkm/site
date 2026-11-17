import type { LinePoint } from "../charts";
import { CJS, CheapFrame, GRID, INK, Legend, legendHeight, rgb, spline } from "./kit";

const LEGEND = [
  { label: "November", stroke: rgb(CJS.blue), fill: rgb(CJS.blue, 0.5) },
  { label: "October", stroke: rgb(CJS.red), fill: rgb(CJS.red, 0.5) },
  { label: "Budget", stroke: rgb(CJS.yellow), fill: rgb(CJS.yellow, 0.5) },
];

const MAX = 450;
const TICKS = Array.from({ length: MAX / 50 + 1 }, (_, i) => i * 50);

// Missing days become 0, so the month crashes to nothing after today. The budget is a whole
// dataset of 400s with a dot on every day, and every ISO date gets a rotated label.
export function CheapLine({
  points,
  height,
  label,
}: {
  points: readonly LinePoint[];
  height: number;
  label: string;
}) {
  return (
    <CheapFrame height={height} label={label}>
      {(width) => {
        const top = legendHeight(LEGEND, width) + 10;
        const left = 44;
        const right = width - 14;
        const bottom = height - 54;
        const x = (i: number) => left + (i / (points.length - 1)) * (right - left);
        const y = (value: number) => bottom - (value / MAX) * (bottom - top);
        const line = (get: (p: LinePoint) => number) =>
          points.map((p, i) => ({ x: x(i), y: y(get(p)) }));
        const november = line((p) => p.values.now ?? 0);
        const october = line((p) => p.values.before ?? 0);
        const budget = line(() => 400);
        const novemberPath = spline(november);
        const datasets = [
          { key: "budget", points: budget, color: CJS.yellow },
          { key: "october", points: october, color: CJS.red },
          { key: "november", points: november, color: CJS.blue },
        ];

        return (
          <>
            <Legend items={LEGEND} width={width} />
            {TICKS.map((tick) => (
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
            {points.map((p, i) => (
              <g key={p.date}>
                <line x1={x(i)} x2={x(i)} y1={top} y2={bottom + 8} stroke={GRID} />
                <text
                  transform={`translate(${x(i)},${bottom + 12}) rotate(-45)`}
                  textAnchor="end"
                  dy="0.7em"
                  fill={INK}
                >
                  {p.date}
                </text>
              </g>
            ))}
            <path
              d={`${novemberPath}L${right},${bottom}L${left},${bottom}Z`}
              fill={rgb(CJS.blue, 0.2)}
            />
            {datasets.map((set) => (
              <g key={set.key}>
                <path
                  d={set.key === "november" ? novemberPath : spline(set.points)}
                  fill="none"
                  stroke={rgb(set.color)}
                  strokeWidth={3}
                />
                {set.points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={3}
                    fill={rgb(set.color, 0.5)}
                    stroke={rgb(set.color)}
                  />
                ))}
              </g>
            ))}
          </>
        );
      }}
    </CheapFrame>
  );
}
