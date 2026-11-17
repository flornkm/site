import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { AXIS_TEXT } from "../core/axes";
import { ChartRoot } from "../core/chart-root";
import { EASE_OUT, IN_VIEW } from "../core/reveal";
import { PALETTE } from "../core/theme";
import { ChartTooltip, TooltipRow, TooltipTitle, glide } from "../core/tooltip";
import { useScrub } from "../core/use-scrub";
import { useWidth } from "../core/use-width";

export type HeatmapChartProps = {
  rows: readonly string[];
  // values[row][column]
  values: readonly (readonly number[])[];
  columnLabel: (column: number) => string;
  // Columns that get a label under the grid, so it doesn't fill with numbers.
  ticks?: readonly number[];
  cellTitle?: (row: number, column: number) => string;
  format?: (value: number) => string;
  valueLabel?: string;
  // Lightest to darkest.
  ramp?: readonly string[];
  // Cells stretch to fill this height; without it they're square.
  height?: number;
  label?: string;
  className?: string;
};

const GUTTER = 22;
const GAP = 2;
const AXIS = 22;
// One hue from pale to deep, blended in OKLCH so each step looks evenly darker than the last.
const DEFAULT_RAMP = [18, 36, 56, 78, 100].map(
  (amount) => `color-mix(in oklch, ${PALETTE[0]} ${amount}%, var(--chart-wash))`,
);

export function HeatmapChart({
  rows,
  values,
  columnLabel,
  ticks = [],
  cellTitle = (row, column) => `${rows[row]} ${columnLabel(column)}`,
  format = String,
  valueLabel = "Value",
  ramp = DEFAULT_RAMP,
  height: fixedHeight,
  label = "Heatmap",
  className,
}: HeatmapChartProps) {
  const reduceMotion = useReducedMotion();
  const [ref, width] = useWidth<HTMLDivElement>();
  const columns = values[0]?.length ?? 0;
  const cell = width > 0 ? (width - GUTTER) / columns : 0;
  const rowHeight = fixedHeight ? (fixedHeight - AXIS) / rows.length : cell;
  const height = rows.length * rowHeight + AXIS;
  const max = useMemo(() => Math.max(...values.flat(), 1), [values]);

  const scrub = useScrub({
    count: rows.length * columns,
    pick: (x, y) => {
      if (cell === 0 || x < GUTTER) return null;
      const column = Math.floor((x - GUTTER) / cell);
      const row = Math.floor(y / rowHeight);
      if (row < 0 || row >= rows.length || column >= columns) return null;
      return row * columns + column;
    },
  });
  const row = Math.floor(scrub.index / Math.max(columns, 1));
  const column = scrub.index % Math.max(columns, 1);
  const value = values[row]?.[column] ?? 0;

  // A few distinct steps rather than a smooth blend: the eye compares steps, not shades.
  const fillFor = (v: number) =>
    v <= 0
      ? "var(--chart-wash)"
      : ramp[Math.min(ramp.length - 1, Math.floor((v / max) * ramp.length - 1e-9))];
  const radius = Math.min(3, (Math.min(cell, rowHeight) - GAP) / 3);

  const cx = GUTTER + column * cell;
  const cy = row * rowHeight;

  return (
    <ChartRoot className={className}>
      <div
        ref={ref}
        {...scrub.props}
        aria-label={label}
        aria-valuetext={`${cellTitle(row, column)}: ${format(value)}`}
        style={{ height: Math.max(height, 60) }}
        className="relative touch-pan-y rounded-md outline-none focus-visible:ring-2 focus-visible:ring-default"
      >
        {cell > 0 && (
          <>
            <svg
              aria-hidden
              width={width}
              height={height}
              className="absolute inset-0 overflow-visible"
              style={AXIS_TEXT}
            >
              {rows.map((name, r) => (
                <text
                  key={`${name}-${r}`}
                  x={0}
                  y={r * rowHeight + rowHeight / 2}
                  dy="0.32em"
                  fill="var(--chart-ink)"
                >
                  {name}
                </text>
              ))}
              {ticks.map((c) => (
                <text
                  key={c}
                  x={GUTTER + c * cell + GAP / 2}
                  y={rows.length * rowHeight + 12}
                  dy="0.32em"
                  fill="var(--chart-ink)"
                >
                  {columnLabel(c)}
                </text>
              ))}
              {values.map((line, r) =>
                line.map((v, c) => (
                  <motion.rect
                    key={`${r}-${c}`}
                    x={GUTTER + c * cell + GAP / 2}
                    y={r * rowHeight + GAP / 2}
                    width={cell - GAP}
                    height={rowHeight - GAP}
                    rx={radius}
                    fill={fillFor(v)}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={IN_VIEW}
                    // A diagonal wave from the top left, quick enough not to keep anyone waiting.
                    transition={{ duration: 0.3, delay: (r + c) * 0.018, ease: EASE_OUT }}
                  />
                )),
              )}
              {/* The hovered cell lifts out of the grid in its own colour, ringed in the card's
                  colour like the hover dots in the other charts. */}
              <g
                style={{
                  transform: `translate(${cx + cell / 2}px, ${cy + rowHeight / 2}px)`,
                  opacity: scrub.visible ? 1 : 0,
                  transition: glide(reduceMotion),
                }}
              >
                <rect
                  x={-(cell - GAP) / 2}
                  y={-(rowHeight - GAP) / 2}
                  width={cell - GAP}
                  height={rowHeight - GAP}
                  rx={radius}
                  fill={fillFor(value)}
                  stroke="var(--chart-surface)"
                  strokeWidth={2}
                  style={{
                    transform: `scale(${scrub.visible ? 1.3 : 1})`,
                    transition: glide(reduceMotion, ["transform"]),
                    filter: "drop-shadow(0 1px 2px oklch(0 0 0 / 0.18))",
                  }}
                />
              </g>
            </svg>
            <ChartTooltip
              x={cx + cell}
              y={Math.max(0, cy - 10)}
              bounds={width}
              visible={scrub.visible}
            >
              <TooltipTitle>{cellTitle(row, column)}</TooltipTitle>
              <TooltipRow color={fillFor(value)} label={valueLabel} value={format(value)} />
            </ChartTooltip>
          </>
        )}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {values.map((line, r) => (
            <tr key={r}>
              <th scope="row">{rows[r]}</th>
              {line.map((v, c) => (
                <td key={c}>
                  {columnLabel(c)}: {format(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ChartRoot>
  );
}
