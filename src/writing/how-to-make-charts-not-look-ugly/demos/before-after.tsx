import { IconCheckmark1Small } from "central-icons/IconCheckmark1Small";
import { useInView, useReducedMotion } from "motion/react";
import {
  type ComponentType,
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cx } from "../charts/core/cx";
import { Blueprint, measureBlueprint, type BlueprintData } from "./blueprint";
import {
  CheapFeaturesCard,
  CheapHoursCard,
  CheapLatencyCard,
  CheapSpendCard,
  CheapTokensCard,
} from "./cheap-dashboard";
import { Bento, SPAN } from "./chart-figure";
import { FeaturesDemo } from "./features-demo";
import { HoursDemo } from "./hours-demo";
import { LatencyDemo } from "./latency-demo";
import { SpendDemo } from "./spend-demo";
import { TokensDemo } from "./tokens-demo";
import "./before-after.css";

// old → build (the default fades out, a technical drawing of the improved card draws itself)
// → new (the improved card fades in under it) → gone (crossfade back) → old.
type Phase = "old" | "build" | "new" | "gone";

const WIDGETS: { span: keyof typeof SPAN; Old: ComponentType; New: ComponentType }[] = [
  { span: "full", Old: CheapSpendCard, New: SpendDemo },
  { span: "wide", Old: CheapTokensCard, New: TokensDemo },
  { span: "narrow", Old: CheapFeaturesCard, New: FeaturesDemo },
  { span: "half", Old: CheapLatencyCard, New: LatencyDemo },
  { span: "half", Old: CheapHoursCard, New: HoursDemo },
];

const BUILD = 1300;
const FADE = 500;
const START = 800;
const STAGGER = 700;
const HOLD = 3000;
const BACK_STAGGER = 250;

const ALL_OLD: Phase[] = WIDGETS.map(() => "old");
const ALL_NEW: Phase[] = WIDGETS.map(() => "new");

function shuffledIndexes() {
  const order = WIDGETS.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// Timers only run while the figure is on screen. Coming back mid-loop first wipes whatever is
// improved back out, so a widget never snaps between states.
function useLoop(active: boolean) {
  const [phases, setPhases] = useState(ALL_OLD);
  const current = useRef(ALL_OLD);

  useEffect(() => {
    if (!active) return;
    const timers: number[] = [];
    const at = (ms: number, run: () => void) => timers.push(window.setTimeout(run, ms));
    const commit = (next: Phase[]) => {
      current.current = next;
      setPhases(next);
    };
    const set = (index: number, phase: Phase) =>
      commit(current.current.map((value, i) => (i === index ? phase : value)));

    function wipeBack(from: number, stagger: number) {
      shuffledIndexes().forEach((index, k) =>
        at(from + k * stagger, () => {
          if (current.current[index] !== "old") set(index, "gone");
        }),
      );
      const done = from + (WIDGETS.length - 1) * stagger + FADE;
      at(done, () => commit(ALL_OLD));
      return done;
    }

    function cycle(from: number) {
      const start = from + START;
      shuffledIndexes().forEach((index, k) => {
        at(start + k * STAGGER, () => set(index, "build"));
        at(start + k * STAGGER + BUILD, () => set(index, "new"));
      });
      const improved = start + (WIDGETS.length - 1) * STAGGER + BUILD + FADE + HOLD;
      at(wipeBack(improved, BACK_STAGGER), () => {
        timers.length = 0;
        cycle(0);
      });
    }

    cycle(current.current.some((phase) => phase !== "old") ? wipeBack(0, 0) : 0);
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return phases;
}

function Cell({
  span,
  Old,
  New,
  phase,
}: {
  span: keyof typeof SPAN;
  Old: ComponentType;
  New: ComponentType;
  phase: Phase;
}) {
  const cellRef = useRef<HTMLDivElement>(null);
  const newRef = useRef<HTMLDivElement>(null);
  const [blueprint, setBlueprint] = useState<BlueprintData | null>(null);

  // Traced from the improved card at the start of every build, before paint, so the drawing
  // matches its real elements at whatever width the card has right now.
  useLayoutEffect(() => {
    if (phase !== "build" || !cellRef.current || !newRef.current) return;
    setBlueprint(measureBlueprint(cellRef.current, newRef.current));
  }, [phase]);

  return (
    <div ref={cellRef} className={cx("before-after-cell", SPAN[span])} data-phase={phase}>
      <div className="before-after-layer before-after-old" aria-hidden inert>
        <Old />
      </div>
      <div
        ref={newRef}
        className="before-after-layer before-after-new"
        inert={phase !== "new" || undefined}
      >
        <New />
      </div>
      {blueprint && <Blueprint key={blueprint.id} data={blueprint} build={BUILD} />}
      <span className="before-after-ring" aria-hidden />
      <span className="before-after-badge font-pretendard">
        <IconCheckmark1Small className="size-4 shrink-0" />
        Improved
      </span>
    </div>
  );
}

export function BeforeAfter() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduceMotion = useReducedMotion();
  const looping = useLoop(inView && !reduceMotion);
  const phases = reduceMotion ? ALL_NEW : looping;

  return (
    <div ref={ref} style={{ "--build": `${BUILD}ms`, "--fade": `${FADE}ms` } as CSSProperties}>
      <Bento>
        {WIDGETS.map(({ span, Old, New }, i) => (
          <Cell key={i} span={span} Old={Old} New={New} phase={phases[i]} />
        ))}
      </Bento>
    </div>
  );
}
