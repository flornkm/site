import { useReducedMotion } from "motion/react";
import { useCallback, useState, type ReactNode } from "react";
import { SeriesKey } from "./key";

const GAP = 14;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// Inline transitions, so hover marks glide the same whatever utility classes the host generates.
export function glide(reduceMotion: boolean | null, properties = ["transform", "opacity"]) {
  if (reduceMotion) return "opacity 150ms ease-out";
  return properties.map((property) => `${property} 180ms ${EASE}`).join(", ");
}

function useBoxWidth() {
  const [width, setWidth] = useState(0);
  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.borderBoxSize[0]?.inlineSize ?? node.offsetWidth);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

// Follows the hovered position and opens on whichever side has room. When neither side does (a
// phone, a dot in the middle), it slides to stay inside the chart rather than off the screen.
export function ChartTooltip({
  x,
  y,
  bounds,
  visible,
  children,
}: {
  x: number;
  y: number;
  bounds: number;
  visible: boolean;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const [ref, width] = useBoxWidth();
  const fitsRight = x + GAP + width <= bounds;
  const side = fitsRight || x < bounds - x ? "right" : "left";
  const preferred = side === "right" ? x + GAP : x - GAP - width;
  const left = Math.max(0, Math.min(bounds - width, preferred));

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-0 left-0 z-10"
      style={{
        transform: `translate(${left}px, ${y}px)`,
        opacity: visible && width > 0 ? 1 : 0,
        transition: glide(reduceMotion),
      }}
    >
      <div
        ref={ref}
        className="w-max rounded-2xl bg-surface px-3 pt-2 pb-1.5 font-pretendard smooth-shadow-ring-md"
        style={{
          minWidth: 164,
          maxWidth: Math.max(164, bounds),
          scale: visible ? "1" : "0.96",
          transformOrigin: side === "left" ? "right top" : "left top",
          transition: glide(reduceMotion, ["scale"]),
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function TooltipTitle({ children }: { children: ReactNode }) {
  return <p className="mb-1 text-xs font-medium text-tertiary">{children}</p>;
}

export function TooltipRow({
  color,
  label,
  value,
  detail,
}: {
  color?: string;
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-xs leading-5">
      {color && <SeriesKey color={color} />}
      <span className="text-secondary">{label}</span>
      <span className="ml-auto pl-4 font-medium text-primary tabular-nums">{value}</span>
      {detail !== undefined && (
        <span className="text-right text-tertiary tabular-nums" style={{ minWidth: 30 }}>
          {detail}
        </span>
      )}
    </div>
  );
}
