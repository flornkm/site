import type { Slice } from "../charts";
import { CJS, CheapFrame, Legend, legendHeight, rgb } from "./kit";

const COLORS = [CJS.blue, CJS.red, CJS.teal, CJS.orange, CJS.purple, CJS.yellow, CJS.grey];

function arc(cx: number, cy: number, inner: number, outer: number, from: number, to: number) {
  const p = (r: number, a: number) => `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  const large = to - from > Math.PI ? 1 : 0;
  return `M${p(outer, from)}A${outer},${outer} 0 ${large} 1 ${p(outer, to)}L${p(inner, to)}A${inner},${inner} 0 ${large} 0 ${p(inner, from)}Z`;
}

// Every slice gets its own rainbow colour, the legend wraps and squeezes the ring, the total is
// centred on the canvas rather than the ring, and the percentage labels pile up on the thin ones.
export function CheapDonut({ slices, label }: { slices: readonly Slice[]; label: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const legend = slices.map((slice, i) => ({
    label: slice.label,
    stroke: "#fff",
    fill: rgb(COLORS[i % COLORS.length]),
  }));

  return (
    <CheapFrame height={(width) => width} label={label}>
      {(width, height) => {
        const top = legendHeight(legend, width) + 10;
        const outer = Math.min(width, height - top) / 2 - 2;
        const inner = outer * 0.5;
        const cx = width / 2;
        const cy = top + (height - top) / 2;
        let angle = -Math.PI / 2;
        const arcs = slices.map((slice, i) => {
          const from = angle;
          angle += (slice.value / total) * Math.PI * 2;
          return { slice, from, to: angle, color: COLORS[i % COLORS.length] };
        });

        return (
          <>
            <Legend items={legend} width={width} />
            {arcs.map(({ slice, from, to, color }) => (
              <path
                key={slice.id}
                d={arc(cx, cy, inner, outer, from, to)}
                fill={rgb(color)}
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
            {arcs.map(({ slice, from, to }) => {
              const mid = (from + to) / 2;
              const r = (inner + outer) / 2;
              return (
                <text
                  key={slice.id}
                  x={cx + r * Math.cos(mid)}
                  y={cy + r * Math.sin(mid)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fff"
                  fontWeight="bold"
                >
                  {`${Math.round((slice.value / total) * 10000) / 100}%`}
                </text>
              );
            })}
            <text
              x={width / 2}
              y={height / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#000"
              fontWeight="bold"
              fontSize={20}
            >
              {`Total: $${total}`}
            </text>
          </>
        );
      }}
    </CheapFrame>
  );
}
