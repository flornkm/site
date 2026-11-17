// A tiny SVG chart kit: no chart library, just scales, paths and React. Each chart lives in its own
// folder and only shares what's in core (theme, axes, legend, tooltip, scales, curves).
export {
  LineChart,
  type LineChartProps,
  type LinePoint,
  type Limit,
} from "./line-chart/line-chart";
export { BarChart, type BarChartProps, type Bucket } from "./bar-chart/bar-chart";
export { DonutChart, type DonutChartProps, type Slice } from "./donut-chart/donut-chart";
export {
  ScatterChart,
  type ScatterChartProps,
  type ScatterPoint,
} from "./scatter-chart/scatter-chart";
export { CHART_THEME, PALETTE } from "./core/theme";
export type { Series } from "./core/series";
export { HeatmapChart, type HeatmapChartProps } from "./heatmap-chart/heatmap-chart";
