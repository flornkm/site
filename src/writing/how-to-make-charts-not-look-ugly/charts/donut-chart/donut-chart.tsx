import { motion, useInView, useReducedMotion } from "motion/react";
import { useId, useRef, useState, type PointerEvent } from "react";
import { ChartRoot } from "../core/chart-root";
import { SeriesKey } from "../core/key";
import { EASE_OUT, IN_VIEW } from "../core/reveal";
import { PALETTE } from "../core/theme";

export type Slice = { id: string; label: string; value: number };

export type DonutChartProps = {
  slices: readonly Slice[];
  format?: (value: number) => string;
  label?: string;
  size?: number;
  thickness?: number;
  className?: string;
};

const GAP = 3;
const CORNER = 3;
const OTHER = "var(--chart-neutral)";

// One ring slice with softly rounded corners and a gap of even width on both edges. Angles are in
// radians, clockwise from twelve o'clock.
function sector(c: number, inner: number, outer: number, from: number, to: number) {
  const point = (r: number, a: number) =>
    `${(c + r * Math.sin(a)).toFixed(2)},${(c - r * Math.cos(a)).toFixed(2)}`;
  const o0 = from + GAP / 2 / outer;
  const o1 = to - GAP / 2 / outer;
  const i0 = from + GAP / 2 / inner;
  const i1 = to - GAP / 2 / inner;
  if (o1 <= o0 || i1 <= i0) return "";
  const r = Math.min(CORNER, (outer - inner) / 2, ((o1 - o0) * outer) / 2);
  const co = r / outer;
  const ci = r / inner;
  const largeOuter = o1 - o0 - 2 * co > Math.PI ? 1 : 0;
  const largeInner = i1 - i0 - 2 * ci > Math.PI ? 1 : 0;
  return [
    `M${point(outer - r, o0)}`,
    `Q${point(outer, o0)} ${point(outer, o0 + co)}`,
    `A${outer},${outer} 0 ${largeOuter} 1 ${point(outer, o1 - co)}`,
    `Q${point(outer, o1)} ${point(outer - r, o1)}`,
    `L${point(inner + r, i1)}`,
    `Q${point(inner, i1)} ${point(inner, i1 - ci)}`,
    `A${inner},${inner} 0 ${largeInner} 0 ${point(inner, i0 + ci)}`,
    `Q${point(inner, i0)} ${point(inner + r, i0)}`,
    "Z",
  ].join("");
}

// As many hues as the palette has, in order. Anything past that folds into a grey "Other"
// instead of inventing another colour.
function withColors(slices: readonly Slice[]) {
  const sorted = [...slices].sort((a, b) => b.value - a.value);
  const named = sorted.slice(0, PALETTE.length).map((slice, i) => ({
    id: slice.id,
    label: slice.label,
    value: slice.value,
    color: PALETTE[i] as string,
  }));
  const rest = sorted.slice(PALETTE.length);
  if (rest.length === 0) return named;
  const other = rest.reduce((sum, slice) => sum + slice.value, 0);
  return [...named, { id: "other", label: "Other", value: other, color: OTHER }];
}

export function DonutChart({
  slices,
  format = String,
  label = "Donut chart",
  size = 176,
  thickness = 12,
  className,
}: DonutChartProps) {
  const reduceMotion = useReducedMotion();
  const maskId = useId();
  // A mask never counts as on screen itself, so the sweep is keyed to the ring's container.
  const ringRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ringRef, IN_VIEW);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const colored = withColors(slices);
  const total = colored.reduce((sum, slice) => sum + slice.value, 0);

  const c = size / 2;
  const outer = c - 4;
  const inner = outer - thickness;
  const radius = outer - thickness / 2;

  let start = 0;
  const arcs = colored.map((slice) => {
    const share = total > 0 ? (slice.value / total) * 100 : 0;
    const from = (start / 100) * Math.PI * 2;
    const to = ((start + share) / 100) * Math.PI * 2;
    const arc = {
      id: slice.id,
      label: slice.label,
      value: slice.value,
      color: slice.color,
      share,
      from: start,
      d: sector(c, inner, outer, from, to),
    };
    start += share;
    return arc;
  });

  const active = arcs.find((arc) => arc.id === highlighted) ?? null;

  // Point at the ring, not at a hairline: the angle under the pointer picks the slice.
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - bounds.left - size / 2;
    const dy = event.clientY - bounds.top - size / 2;
    const distance = Math.hypot(dx, dy);
    if (distance < inner - 6 || distance > outer + 6) {
      return setHighlighted(null);
    }
    const turn = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
    const at = (turn / 360) * 100;
    setHighlighted(arcs.find((arc) => at >= arc.from && at < arc.from + arc.share)?.id ?? null);
  };

  return (
    <ChartRoot className={className}>
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
        <div ref={ringRef} className="relative shrink-0" style={{ width: size, height: size }}>
          <svg
            aria-hidden
            width={size}
            height={size}
            className="overflow-visible"
            onPointerMove={onPointerMove}
            onPointerLeave={() => setHighlighted(null)}
          >
            {/* The ring sweeps in clockwise from twelve o'clock behind a mask. */}
            <defs>
              <mask id={maskId}>
                <motion.circle
                  cx={c}
                  cy={c}
                  r={radius}
                  fill="none"
                  stroke="white"
                  strokeWidth={thickness + 16}
                  pathLength={100}
                  transform={`rotate(-90 ${c} ${c})`}
                  initial={{ strokeDasharray: "0 100" }}
                  animate={{ strokeDasharray: inView ? "100 0" : "0 100" }}
                  transition={{ duration: 0.9, ease: EASE_OUT }}
                />
              </mask>
            </defs>
            <g mask={`url(#${maskId})`}>
              {arcs.map((arc) => (
                <path
                  key={arc.id}
                  d={arc.d}
                  fill={arc.color}
                  style={{
                    opacity: highlighted && highlighted !== arc.id ? 0.2 : 1,
                    transform: `scale(${highlighted === arc.id ? 1.045 : 1})`,
                    transformOrigin: `${c}px ${c}px`,
                    transition: reduceMotion
                      ? "opacity 150ms ease-out"
                      : "opacity 150ms ease-out, transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                />
              ))}
            </g>
          </svg>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <p className="text-2xl leading-none font-medium tracking-tight text-primary tabular-nums">
              {format(active ? active.value : total)}
            </p>
          </div>
        </div>

        <ul
          className="-mx-2.5 min-w-0 flex-1 text-xs"
          style={{ flexBasis: 220, maxWidth: 380 }}
          aria-label={label}
        >
          {arcs.map((arc, i) => {
            const isActive = highlighted === arc.id;
            // A divider disappears when either row it separates is lit, so the lit row reads as
            // one soft shape rather than a box between two lines.
            const hideDivider = i === 0 || isActive || (i > 0 && highlighted === arcs[i - 1].id);
            return (
              <li key={arc.id} className="relative">
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-2.5 top-0 h-px"
                  style={{ background: "var(--chart-grid)", opacity: hideDivider ? 0 : 1 }}
                />
                <button
                  type="button"
                  aria-pressed={isActive}
                  onPointerEnter={() => setHighlighted(arc.id)}
                  onPointerLeave={() => setHighlighted(null)}
                  onFocus={() => setHighlighted(arc.id)}
                  onBlur={() => setHighlighted(null)}
                  onClick={() => setHighlighted(isActive ? null : arc.id)}
                  style={{ background: isActive ? "var(--chart-wash)" : "transparent" }}
                  className="flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-default"
                >
                  <SeriesKey color={arc.color} />
                  <span className="text-secondary">{arc.label}</span>
                  <span className="ml-auto font-medium text-primary tabular-nums">
                    {Math.round(arc.share)}%
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </ChartRoot>
  );
}
