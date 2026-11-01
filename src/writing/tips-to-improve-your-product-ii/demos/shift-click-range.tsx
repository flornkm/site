import { cn } from "@/lib/utils";
import { IconCheckmark1Small } from "central-icons/IconCheckmark1Small";
import { IconShift } from "central-icons/IconShift";
import { useEffect, useState } from "react";
import { DemoFrame, KEY_BUTTON, KEYCAP, PANEL, SUBTITLE, TITLE } from "./demo-frame";

/* A list of expenses with checkboxes. Shift-click sets every row between the last one clicked and
   this one to whatever the clicked row becomes, like Finder or Gmail. While shift is held, the rows
   a click would change show it ahead of time. On touch, the shift key can be tapped to latch it for
   the next tap. */

const EXPENSES = [
  { name: "Studio rent", date: "Oct 1", amount: 640 },
  { name: "Coffee with Alicia", date: "Oct 3", amount: 7.4 },
  { name: "Team lunch", date: "Oct 14", amount: 76.5 },
  { name: "Taxi to the airport", date: "Oct 21", amount: 38.2 },
];

const euro = new Intl.NumberFormat("en", { style: "currency", currency: "EUR" });

const ROW = cn(
  "flex h-9 w-full cursor-pointer items-center gap-3 rounded-[8px] px-2.5 text-left text-[13px] outline-none",
  "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]",
);
const SELECTED_ROW =
  "bg-black/[0.05] hover:bg-black/[0.065] dark:bg-white/[0.07] dark:hover:bg-white/[0.09]";

function Checkbox({ checked, ghost }: { checked: boolean; ghost: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid size-4 shrink-0 place-items-center transition-opacity duration-150 ease-out",
        ghost && "opacity-40",
      )}
    >
      {/* The outline and the fill cross-fade, the fill and the check coming in from a slight blur,
          so the box morphs into its checked state instead of switching. */}
      <span
        className={cn(
          "absolute inset-0 rounded-[5px] shadow-[inset_0_0_0_1.5px_oklch(0_0_0/0.2)] transition-opacity duration-200 ease-out dark:shadow-[inset_0_0_0_1.5px_oklch(1_0_0/0.25)]",
          checked && "opacity-0",
        )}
      />
      <span
        className={cn(
          "absolute inset-0 rounded-[5px] bg-[oklch(0.32_0_0)] transition-[opacity,scale,filter] duration-200 ease-out dark:bg-[oklch(0.88_0_0)]",
          !checked && "scale-[0.8] opacity-0 blur-[1px]",
        )}
      />
      <IconCheckmark1Small
        className={cn(
          "relative size-3.5 text-white transition-[opacity,scale,filter] duration-200 ease-out dark:text-[oklch(0.2_0_0)]",
          !checked && "scale-50 opacity-0 blur-[2px]",
        )}
      />
    </span>
  );
}

export function ShiftClickRange() {
  const [checked, setChecked] = useState(() => EXPENSES.map(() => false));
  const [anchor, setAnchor] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [latched, setLatched] = useState(false);

  const shift = shiftHeld || latched;
  const preview =
    shift && anchor !== null && hover !== null && hover !== anchor
      ? { from: Math.min(anchor, hover), to: Math.max(anchor, hover), value: !checked[hover] }
      : null;

  const count = checked.filter(Boolean).length;
  const total = EXPENSES.reduce((sum, expense, i) => sum + (checked[i] ? expense.amount : 0), 0);
  const summary =
    count > 0 ? (
      <>
        {count} selected
        <span
          aria-hidden
          className="mx-1.5 size-[3.5px] shrink-0 rounded-[1px] bg-current opacity-25"
        />
        {euro.format(total)}
      </>
    ) : (
      "October"
    );

  // The keyboard is outside React: shift can go down anywhere on the page, before the click.
  useEffect(() => {
    const sync = (event: KeyboardEvent) => setShiftHeld(event.shiftKey);
    const reset = () => setShiftHeld(false);
    window.addEventListener("keydown", sync);
    window.addEventListener("keyup", sync);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", sync);
      window.removeEventListener("keyup", sync);
      window.removeEventListener("blur", reset);
    };
  }, []);

  function toggle(index: number, shiftKey: boolean) {
    const value = !checked[index];
    const ranged = (shiftKey || latched) && anchor !== null;
    const from = ranged ? Math.min(anchor, index) : index;
    const to = ranged ? Math.max(anchor, index) : index;
    setChecked((rows) => rows.map((row, i) => (i >= from && i <= to ? value : row)));
    setAnchor(index);
    setLatched(false);
  }

  return (
    <DemoFrame>
      <div className={PANEL}>
        <div className="px-2.5">
          <p className={TITLE}>Expenses</p>
          {/* Flex centres the divider on the line box, which at this size is the middle of the
              digits; align-middle sits on the x-height instead and reads low. */}
          <p className={cn(SUBTITLE, "flex items-center tabular-nums")}>{summary}</p>
        </div>

        <div
          role="group"
          aria-label="Expenses"
          className="mt-3 flex flex-col gap-0.5"
          onPointerLeave={() => setHover(null)}
        >
          {EXPENSES.map((expense, index) => {
            const selected = checked[index];
            const inPreview = preview !== null && index >= preview.from && index <= preview.to;
            const shown = inPreview ? preview.value : selected;
            return (
              <button
                key={expense.name}
                type="button"
                role="checkbox"
                aria-checked={selected}
                // Shift-mousedown would otherwise select the text between the two rows.
                onMouseDown={(event) => event.shiftKey && event.preventDefault()}
                onPointerEnter={() => setHover(index)}
                onClick={(event) => toggle(index, event.shiftKey)}
                className={cn(
                  ROW,
                  selected && SELECTED_ROW,
                  // Tighter inner corners keep a run of selected rows reading as one block.
                  selected && checked[index - 1] && "rounded-t-[3px]",
                  selected && checked[index + 1] && "rounded-b-[3px]",
                )}
              >
                <Checkbox checked={shown} ghost={shown !== selected} />
                <span className="min-w-0 flex-1 truncate text-primary">{expense.name}</span>
                <span className="w-12 shrink-0 text-tertiary tabular-nums">{expense.date}</span>
                <span className="w-[68px] shrink-0 text-right text-secondary tabular-nums">
                  {euro.format(expense.amount)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto">
        <button
          type="button"
          aria-label="Shift"
          aria-pressed={latched}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setLatched((on) => !on)}
          data-pressed={shift}
          className={KEY_BUTTON}
        >
          <span className={cn(KEYCAP, "min-w-[72px] pb-1")}>
            <IconShift className="size-3.5" />
          </span>
        </button>
      </div>
    </DemoFrame>
  );
}
