import type { CSSProperties } from "react";

// One ramp that turns through OKLCH at even perceived steps: violet, magenta, apricot. Three
// steps on purpose, since that's as many as stay apart for every reader; a chart with more
// categories folds the rest into a grey "Other". The chroma runs past sRGB, so wide-gamut screens
// get the full colour and the rest get the browser's closest match.
export const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"] as const;

// Inline and built on light-dark(), so a chart themes itself without any stylesheet. Override any
// of these on a parent to re-theme every chart inside it.
export const CHART_THEME = {
  "--chart-1": "light-dark(oklch(0.5 0.23 285), oklch(0.55 0.24 290))",
  "--chart-2": "light-dark(oklch(0.63 0.23 340), oklch(0.63 0.22 345))",
  "--chart-3": "light-dark(oklch(0.76 0.16 55), oklch(0.67 0.15 60))",
  "--chart-neutral": "light-dark(oklch(0.86 0.008 260), oklch(0.4 0.01 260))",
  "--chart-target": "light-dark(oklch(0.64 0.17 25), oklch(0.66 0.16 25))",
  "--chart-axis": "light-dark(oklch(0.86 0.008 260), oklch(0.34 0.01 260))",
  "--chart-grid": "light-dark(oklch(0.945 0.005 260), oklch(0.22 0.008 260))",
  "--chart-ink": "light-dark(oklch(0.56 0.012 260), oklch(0.68 0.012 260))",
  // What the chart sits on, for halos and rings. A card sets --chart-backdrop to its own fill.
  "--chart-surface": "var(--chart-backdrop, var(--bg-primary, light-dark(#fdfdfd, #000)))",
  "--chart-wash": "light-dark(oklch(0.96 0.006 260), oklch(0.2 0.008 260))",
} as CSSProperties;
