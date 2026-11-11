import { ScatterChart, type ScatterPoint } from "../charts";
import { ChartCard } from "./chart-figure";
import { MODELS, random } from "./models";

// How long each model takes before the first token appears: a fixed start-up cost plus the time
// it takes to read the prompt. Bigger models read slower. Prices are per million input tokens.
const PROFILE = {
  opus: { base: 0.9, read: 60_000, price: 15 },
  sonnet: { base: 0.5, read: 110_000, price: 3 },
  haiku: { base: 0.25, read: 260_000, price: 0.8 },
} as const;

function makeRequests(): ScatterPoint[] {
  const next = random(23);
  return Array.from({ length: 110 }, (_, i) => {
    const roll = next();
    const model = roll < 0.25 ? "opus" : roll < 0.65 ? "sonnet" : "haiku";
    const profile = PROFILE[model];
    const prompt = Math.round(2_000 + next() ** 1.4 * 148_000);
    const wait = (profile.base + prompt / profile.read) * (0.82 + next() * 0.36);
    return {
      id: `request-${i}`,
      series: model,
      x: prompt,
      y: Math.round(wait * 100) / 100,
      details: [["Input cost", `$${((prompt / 1_000_000) * profile.price).toFixed(3)}`]],
    };
  });
}

const REQUESTS = makeRequests();
const MEDIAN = [...REQUESTS].sort((a, b) => a.y - b.y)[Math.floor(REQUESTS.length / 2)].y;

const tokens = (value: number) => (value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`);
const seconds = (value: number) => `${Math.round(value * 10) / 10}s`;

export function LatencyDemo() {
  return (
    <ChartCard
      title="Time to first token by prompt size"
      value={`${MEDIAN.toFixed(2)}s`}
      span="half"
    >
      <ScatterChart
        points={REQUESTS}
        series={MODELS}
        xLabel="Prompt size"
        yLabel="Time to first token"
        formatX={tokens}
        formatY={seconds}
        height={260}
        label="Time to first token against prompt size for each request, by model"
      />
    </ChartCard>
  );
}
