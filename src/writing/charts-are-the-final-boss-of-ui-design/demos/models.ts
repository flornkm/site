import { PALETTE, type Series } from "../charts";

// The same three models, in the same colours, in every chart of the post.
export const MODELS: Series[] = [
  { key: "opus", label: "Opus", color: PALETTE[0] },
  { key: "sonnet", label: "Sonnet", color: PALETTE[1] },
  { key: "haiku", label: "Haiku", color: PALETTE[2] },
];

export const dollars = (value: number) => {
  const cents = Math.round(value * 100) / 100;
  return cents >= 100 || Number.isInteger(cents) ? `$${Math.round(cents)}` : `$${cents.toFixed(2)}`;
};

// Seeded, so generated data lands in the same place on the server and in the browser.
export function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
