import type { Bucket } from "../charts";
import { CheapFrame, INK, sloppyTicks, textWidth } from "./kit";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658"];
const MARGIN = { top: 5, right: 30, bottom: 5, left: 20 };
const Y_AXIS = 60;
const X_AXIS = 30;
const LEGEND = 26;

// Grouped instead of stacked (the stack id was never set), every date label forced on, and a
// fixed 60px axis that clips whatever the float ticks spill past it.
export function CheapBars({
  buckets,
  keys,
  height,
  label,
}: {
  buckets: readonly Bucket[];
  keys: readonly string[];
  height: number;
  label: string;
}) {
  const max = Math.max(...buckets.flatMap((b) => keys.map((k) => b.values[k])));
  const ticks = sloppyTicks(max, 4);

  return (
    <CheapFrame height={height} label={label}>
      {(width) => {
        const left = MARGIN.left + Y_AXIS;
        const right = width - MARGIN.right;
        const top = MARGIN.top;
        const bottom = height - MARGIN.bottom - LEGEND - X_AXIS;
        const band = (right - left) / buckets.length;
        const offset = band * 0.1;
        const barWidth = (band - offset * 2 - 4 * (keys.length - 1)) / keys.length;
        const y = (value: number) => bottom - (value / max) * (bottom - top);
        const legendWidth =
          keys.reduce((sum, key) => sum + 18 + textWidth(key), 0) + 10 * (keys.length - 1);
        let legendX = (width - legendWidth) / 2;

        return (
          <>
            {ticks.map((tick) => (
              <line
                key={tick}
                x1={left}
                x2={right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="#ccc"
                strokeDasharray="3 3"
              />
            ))}
            {buckets.map((b, i) => (
              <line
                key={b.date}
                x1={left + band * (i + 0.5)}
                x2={left + band * (i + 0.5)}
                y1={top}
                y2={bottom}
                stroke="#ccc"
                strokeDasharray="3 3"
              />
            ))}
            {buckets.map((b, i) =>
              keys.map((key, k) => (
                <rect
                  key={`${b.date}-${key}`}
                  x={left + band * i + offset + k * (barWidth + 4)}
                  y={y(b.values[key])}
                  width={barWidth}
                  height={bottom - y(b.values[key])}
                  fill={COLORS[k]}
                />
              )),
            )}
            <line x1={left} x2={right} y1={bottom} y2={bottom} stroke={INK} />
            <line x1={left} x2={left} y1={top} y2={bottom} stroke={INK} />
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={left - 6} x2={left} y1={y(tick)} y2={y(tick)} stroke={INK} />
                <text
                  x={left - 8}
                  y={y(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill={INK}
                >
                  {String(tick)}
                </text>
              </g>
            ))}
            {buckets.map((b, i) => (
              <g key={b.date}>
                <line
                  x1={left + band * (i + 0.5)}
                  x2={left + band * (i + 0.5)}
                  y1={bottom}
                  y2={bottom + 6}
                  stroke={INK}
                />
                <text x={left + band * (i + 0.5)} y={bottom + 20} textAnchor="middle" fill={INK}>
                  {b.date}
                </text>
              </g>
            ))}
            {keys.map((key, k) => {
              const x = legendX;
              legendX += 18 + textWidth(key) + 10;
              return (
                <g key={key} transform={`translate(${x},${height - MARGIN.bottom - 18})`}>
                  <rect width={14} height={14} fill={COLORS[k]} />
                  <text x={18} y={11.5} fill={COLORS[k]}>
                    {key}
                  </text>
                </g>
              );
            })}
          </>
        );
      }}
    </CheapFrame>
  );
}
