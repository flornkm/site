import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from "motion/react";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

// Turning the card over by dragging it sideways, tapping it, or with the keyboard.
// `turn` counts half turns (0 front, 1 back, 2 front…) and renderers rotate by π·turn.
//
// While dragging, the edge that lifts follows the pointer: an edge at angle θ sits at
// cos θ of its resting position, so the pointer's travel (as a share of the card's width,
// 0 to 1 for a whole half turn) maps to θ through acos. Dragging further carries on into
// the next half turn, so the card can be turned over and over.
type Drag = { origin: number; from: number; moved: boolean };

function reach(turn: number) {
  const whole = Math.floor(turn);
  return whole + (1 - Math.cos(Math.PI * (turn - whole))) / 2;
}

function turnAt(travel: number) {
  const whole = Math.floor(travel);
  return whole + Math.acos(1 - 2 * (travel - whole)) / Math.PI;
}

export function useFlipGesture(width: number, enabled = true) {
  const reduceMotion = useReducedMotion();
  const turn = useMotionValue(0);
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  const drag = useRef<Drag | null>(null);
  // Whether the card is resting lifted under a mouse, so leaving only undoes that lift.
  const lifted = useRef(false);
  const [showingBack, setShowingBack] = useState(false);
  useMotionValueEvent(turn, "change", (value) => setShowingBack(Math.round(value) % 2 !== 0));

  function settle(target: number, gentle = false) {
    lifted.current = false;
    animation.current?.stop();
    animation.current = animate(
      turn,
      target,
      reduceMotion
        ? { duration: 0 }
        : { type: "spring", visualDuration: gentle ? 0.4 : 0.75, bounce: gentle ? 0 : 0.18 },
    );
  }

  function flip() {
    settle(Math.round(turn.get()) + 1);
  }

  function release() {
    const state = drag.current;
    drag.current = null;
    if (!state) return;
    if (!state.moved) {
      flip();
      return;
    }
    // At most one half turn per throw, in the direction it was thrown.
    const start = Math.round(state.from);
    const velocity = turn.getVelocity();
    const current = turn.get();
    let target = Math.round(current);
    if (velocity > 1.2) target = Math.ceil(current);
    else if (velocity < -1.2) target = Math.floor(current);
    settle(Math.max(start - 1, Math.min(start + 1, target)));
  }

  const bind = {
    role: "button",
    tabIndex: enabled ? 0 : -1,
    "aria-label": showingBack ? "Turn the card to the front" : "Turn the card over",
    "aria-disabled": !enabled,
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (!enabled || event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      animation.current?.stop();
      drag.current = { origin: event.clientX, from: turn.get(), moved: false };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const state = drag.current;
      if (!state) return;
      const delta = event.clientX - state.origin;
      if (!state.moved && Math.abs(delta) < 4) return;
      state.moved = true;
      // Pulling left lifts the right edge (a positive turn), pulling right the left one.
      turn.set(turnAt(reach(state.from) - delta / width));
    },
    onPointerUp: release,
    onPointerCancel: release,
    // A mouse resting on the card lifts its right edge a hair, the way a corner invites a
    // thumb. Touch pointers also "leave" on every lift of the finger, so only a mouse
    // lift is ever undone on leave, never a turn that's under way.
    onPointerEnter(event: PointerEvent) {
      if (!enabled || event.pointerType !== "mouse" || drag.current) return;
      settle(Math.round(turn.get()) + 0.012, true);
      lifted.current = true;
    },
    onPointerLeave() {
      if (lifted.current) settle(Math.round(turn.get()), true);
    },
    onKeyDown(event: KeyboardEvent) {
      if (!enabled || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      flip();
    },
  };

  return { turn, showingBack, bind };
}
