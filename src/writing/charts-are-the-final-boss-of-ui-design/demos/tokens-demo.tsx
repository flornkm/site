import { BarChart, type Bucket } from "../charts";
import { ChartCard } from "./chart-figure";
import { MODELS } from "./models";

// Millions of tokens a day, per model, for the last two weeks.
const ROWS: [string, number, number, number][] = [
  ["2026-10-29", 1.2, 3.4, 2.1],
  ["2026-10-30", 1.4, 3.8, 2.3],
  ["2026-10-31", 0.3, 1.1, 0.9],
  ["2026-11-01", 0.2, 0.9, 0.8],
  ["2026-11-02", 1.6, 4.1, 2.6],
  ["2026-11-03", 1.8, 4.4, 2.4],
  ["2026-11-04", 1.5, 4.0, 2.8],
  ["2026-11-05", 2.1, 4.6, 3.0],
  ["2026-11-06", 1.9, 4.2, 2.7],
  ["2026-11-07", 0.4, 1.3, 1.0],
  ["2026-11-08", 0.3, 1.0, 0.9],
  ["2026-11-09", 2.3, 4.9, 3.1],
  ["2026-11-10", 2.6, 5.2, 3.3],
  ["2026-11-11", 2.4, 5.0, 3.4],
];

const BUCKETS: Bucket[] = ROWS.map(([date, opus, sonnet, haiku]) => ({
  date,
  values: { opus, sonnet, haiku },
}));

const TOTAL = `${Math.round(ROWS.reduce((sum, [, a, b, c]) => sum + a + b + c, 0))}M`;

const tokens = (value: number) => `${value.toFixed(1)}M`;
const axisTokens = (value: number) => `${value}M`;

export function TokensDemo() {
  return (
    <ChartCard title="Tokens per day" value={TOTAL} span="wide">
      <BarChart
        buckets={BUCKETS}
        series={MODELS}
        format={tokens}
        axisFormat={axisTokens}
        height={250}
        label="Tokens used per day, by model"
      />
    </ChartCard>
  );
}
