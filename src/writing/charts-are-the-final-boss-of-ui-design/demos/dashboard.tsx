import { Bento } from "./chart-figure";
import { FeaturesDemo } from "./features-demo";
import { HoursDemo } from "./hours-demo";
import { LatencyDemo } from "./latency-demo";
import { SpendDemo } from "./spend-demo";
import { TokensDemo } from "./tokens-demo";

export function Dashboard() {
  return (
    <Bento>
      <SpendDemo />
      <TokensDemo />
      <FeaturesDemo />
      <LatencyDemo />
      <HoursDemo />
    </Bento>
  );
}
