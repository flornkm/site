import { useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";

const STEP_KEYS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowDown: -1,
  ArrowRight: 1,
  ArrowUp: 1,
};

// Scrubbing through a chart's positions with a pointer, a finger, or the arrow keys. `pick` maps a
// pointer position inside the chart to the index it should snap to, or null for nothing nearby.
export function useScrub({
  count,
  pick,
}: {
  count: number;
  pick: (x: number, y: number) => number | null;
}) {
  const [active, setActive] = useState(count - 1);
  const [visible, setVisible] = useState(false);
  const [pointerY, setPointerY] = useState<number | null>(null);
  const index = Math.max(0, Math.min(count - 1, active));

  const onPointer = (event: PointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const next = pick(x, y);
    if (next === null) return setVisible(false);
    setActive(next);
    setPointerY(y);
    setVisible(true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") return setVisible(false);
    let next: number | null = null;
    if (event.key in STEP_KEYS) next = index + STEP_KEYS[event.key];
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = count - 1;
    if (next === null) return;
    event.preventDefault();
    setActive(Math.max(0, Math.min(count - 1, next)));
    setPointerY(null);
    setVisible(true);
  };

  return {
    index,
    visible,
    pointerY,
    props: {
      tabIndex: 0,
      role: "slider" as const,
      "aria-valuemin": 0,
      "aria-valuemax": count - 1,
      "aria-valuenow": index,
      onPointerMove: onPointer,
      onPointerDown: onPointer,
      onPointerLeave: () => setVisible(false),
      onKeyDown,
      // A click focuses the chart too, but only keyboard focus should open the tooltip by itself.
      onFocus: (event: FocusEvent<HTMLElement>) => {
        if (event.currentTarget.matches(":focus-visible")) setVisible(true);
      },
      onBlur: () => setVisible(false),
    },
  };
}
