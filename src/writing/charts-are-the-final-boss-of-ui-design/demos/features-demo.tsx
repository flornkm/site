import { DonutChart, type Slice } from "../charts";
import { ChartCard } from "./chart-figure";
import { dollars } from "./models";

// November so far, split by the feature that made the call. Adds up to the line chart's $162.
const SLICES: Slice[] = [
  { id: "chat", label: "Chat", value: 58 },
  { id: "review", label: "Code review", value: 41 },
  { id: "agents", label: "Agents", value: 33 },
  { id: "search", label: "Search", value: 17 },
  { id: "summaries", label: "Summaries", value: 9.4 },
  { id: "embeddings", label: "Embeddings", value: 2.4 },
  { id: "translation", label: "Translation", value: 1.2 },
];

export function FeaturesDemo() {
  return (
    <ChartCard title="Spend by feature" span="narrow">
      <DonutChart
        slices={SLICES}
        format={dollars}
        size={148}
        thickness={13}
        label="AI spend this month, by feature"
      />
    </ChartCard>
  );
}
