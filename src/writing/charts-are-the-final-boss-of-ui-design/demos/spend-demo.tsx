import { LineChart, PALETTE, type LinePoint, type Series } from "../charts";
import { ChartCard } from "./chart-figure";
import { dollars } from "./models";

const SERIES: Series[] = [
  { key: "now", label: "November", color: PALETTE[0] },
  { key: "before", label: "October", color: "var(--chart-neutral)" },
];

// What each day of November has cost so far. Weekends are quiet.
const NOVEMBER = [6, 15, 17, 18, 16, 17, 7, 6, 19, 21, 20];

function cumulative(daily: readonly number[]) {
  let sum = 0;
  return daily.map((day) => (sum += day));
}

// October, laid over the same days of the month: steady weekdays, quiet weekends.
const OCTOBER = cumulative(
  Array.from({ length: 30 }, (_, i) => {
    const weekday = new Date(Date.UTC(2026, 9, i + 1)).getUTCDay();
    return weekday === 0 || weekday === 6 ? 5 : 11 + (i % 3);
  }),
);
const NOW = cumulative(NOVEMBER);

const POINTS: LinePoint[] = OCTOBER.map((before, i) => ({
  date: `2026-11-${String(i + 1).padStart(2, "0")}`,
  values: { now: NOW[i] ?? null, before },
}));

export function SpendDemo() {
  return (
    <ChartCard title="Spend this month" value={dollars(NOW[NOW.length - 1])} span="full">
      <LineChart
        points={POINTS}
        series={SERIES}
        limit={{ value: 400, label: "Budget" }}
        forecastTo="2026-11-30"
        format={dollars}
        height={240}
        label="AI spend this month against last month, with the monthly budget"
      />
    </ChartCard>
  );
}
