import { HeatmapChart } from "../charts";
import { ChartCard } from "./chart-figure";
import { random } from "./models";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Requests per hour over a typical week: busy working hours, a dip at lunch, quiet weekends.
function makeWeek() {
  const next = random(5);
  return DAYS.map((_, day) =>
    Array.from({ length: 24 }, (_, hour) => {
      const work = Math.exp(-((hour - 11) ** 2) / 10) + 0.9 * Math.exp(-((hour - 15.5) ** 2) / 8);
      const lunch = hour === 13 ? 0.75 : 1;
      const weekend = day >= 5 ? 0.18 : 1;
      const night = hour < 7 || hour > 21 ? 0.15 : 1;
      return Math.round((40 + 1400 * work * lunch * weekend * night) * (0.8 + next() * 0.4));
    }),
  );
}

const WEEK = makeWeek();
const PEAK = WEEK.flatMap((hours, day) => hours.map((value, hour) => ({ value, day, hour }))).sort(
  (a, b) => b.value - a.value,
)[0];

const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

export function HoursDemo() {
  return (
    <ChartCard title="Busiest hours" value={`${DAYS[PEAK.day]} ${hourLabel(PEAK.hour)}`}>
      <HeatmapChart
        rows={DAYS.map((day) => day[0])}
        values={WEEK}
        columnLabel={hourLabel}
        ticks={[0, 6, 12, 18]}
        cellTitle={(day, hour) => `${FULL_DAYS[day]}, ${hourLabel(hour)}`}
        format={(value) => value.toLocaleString("en-US")}
        valueLabel="Requests"
        height={260}
        label="Requests per hour across a week"
      />
    </ChartCard>
  );
}
