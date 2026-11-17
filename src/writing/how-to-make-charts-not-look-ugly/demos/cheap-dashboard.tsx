import { CheapBars } from "../cheap/cheap-bars";
import { CheapDonut } from "../cheap/cheap-donut";
import { CheapHeatmap } from "../cheap/cheap-heatmap";
import { CheapLine } from "../cheap/cheap-line";
import { CheapScatter } from "../cheap/cheap-scatter";
import { Bento, ChartCard } from "./chart-figure";
import { SLICES } from "./features-demo";
import { BUSIEST, WEEK } from "./hours-demo";
import { MEDIAN, REQUESTS } from "./latency-demo";
import { dollars } from "./models";
import { NOW, POINTS } from "./spend-demo";
import { BUCKETS, TOTAL } from "./tokens-demo";

// The same cards and data as the real dashboard, drawn the way library defaults draw them.
export function CheapSpendCard() {
  return (
    <ChartCard title="Spend this month" value={dollars(NOW[NOW.length - 1])} span="full">
      <CheapLine points={POINTS} height={240} label="AI spend this month against last month" />
    </ChartCard>
  );
}

export function CheapTokensCard() {
  return (
    <ChartCard title="Tokens per day" value={TOTAL} span="wide">
      <CheapBars
        buckets={BUCKETS}
        keys={["opus", "sonnet", "haiku"]}
        height={250}
        label="Tokens used per day, by model"
      />
    </ChartCard>
  );
}

export function CheapFeaturesCard() {
  return (
    <ChartCard title="Spend by feature" span="narrow">
      <CheapDonut slices={SLICES} label="AI spend this month, by feature" />
    </ChartCard>
  );
}

export function CheapLatencyCard() {
  return (
    <ChartCard title="Time to first token by prompt size" value={`${MEDIAN.toFixed(2)}s`}>
      <CheapScatter
        points={REQUESTS}
        height={260}
        label="Time to first token against prompt size for each request, by model"
      />
    </ChartCard>
  );
}

export function CheapHoursCard() {
  return (
    <ChartCard title="Busiest hours" value={BUSIEST}>
      <CheapHeatmap values={WEEK} height={260} label="Requests per hour across a week" />
    </ChartCard>
  );
}

export function CheapDashboard() {
  return (
    <Bento>
      <CheapSpendCard />
      <CheapTokensCard />
      <CheapFeaturesCard />
      <CheapLatencyCard />
      <CheapHoursCard />
    </Bento>
  );
}
