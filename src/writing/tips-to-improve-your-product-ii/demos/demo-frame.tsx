import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/* The frame and the before/after pill every demo in this post shares, so the new ones match the
   cheque and the invite exactly. */

export function DemoFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <figure
      className={cn(
        "not-prose mx-auto my-8 flex min-h-[374px] w-full max-w-[520px] flex-col items-center px-4 pt-14 pb-6 font-pretendard max-lg:-mx-4 md:px-12",
        "rounded-sm outline -outline-offset-1 outline-black/5 dark:outline-white/8",
        className,
      )}
    >
      {children}
    </figure>
  );
}

export function ModeSwitch<T extends string>({
  label,
  modes,
  value,
  onChange,
}: {
  label: string;
  modes: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const index = modes.findIndex((mode) => mode.value === value);
  return (
    <div
      role="group"
      aria-label={label}
      className="relative mt-auto flex rounded-full bg-surface-tertiary p-1"
    >
      <span
        aria-hidden
        style={{ transform: `translateX(${index * 100}%)` }}
        className="pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/2)] rounded-full bg-surface smooth-shadow-ring-sm transition-transform duration-200 ease-out"
      />
      {modes.map((mode) => {
        const active = mode.value === value;
        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            aria-pressed={active}
            className={cn(
              "relative w-[5.5rem] cursor-pointer whitespace-nowrap rounded-full py-1.5 text-[12px] font-medium transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-default",
              active ? "text-primary" : "text-tertiary hover:text-secondary",
            )}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

// Content that lives on the page itself, with no card around it.
export const PANEL = "w-full max-w-[340px]";
// For things that really are a surface of their own, like a dialog.
export const CARD = "w-full max-w-[340px] rounded-[20px] bg-surface p-4 smooth-shadow-ring-xs";
export const TITLE = "text-[13px] leading-[18px] font-medium text-primary";
export const SUBTITLE = "text-[13px] leading-[18px] text-tertiary";
// A Mac-style keycap: a softly lit top with a highlight on its front lip, standing on a 2.5px side
// wall. Pressed, it sinks into the wall, fast on the way down and a little slower back up. Goes
// inside a `group/key` button that sets `data-pressed`, with 3px of bottom padding for the wall.
export const KEYCAP = cn(
  "flex h-8 min-w-12 items-end rounded-[8px] px-2 pb-[5px] text-[11px] leading-none font-medium text-secondary",
  "bg-linear-to-b from-white to-[oklch(0.975_0_0)] dark:from-[oklch(0.33_0_0)] dark:to-[oklch(0.29_0_0)]",
  "[--depth:2.5px] [--drop:oklch(0_0_0/0.1)] [--edge:oklch(0_0_0/0.13)] [--lip:oklch(1_0_0)] [--side:oklch(0.9_0_0)]",
  "dark:[--drop:oklch(0_0_0/0.45)] dark:[--edge:oklch(0_0_0/0.7)] dark:[--lip:oklch(1_0_0/0.1)] dark:[--side:oklch(0.22_0_0)]",
  "shadow-[inset_0_1px_0_var(--lip),0_0_0_0.5px_var(--edge),0_var(--depth)_0_var(--side),0_var(--depth)_0_0.5px_var(--edge),0_calc(var(--depth)+1.5px)_5px_-1px_var(--drop)]",
  "transition-[translate,box-shadow] duration-150 ease-out",
  "group-data-[pressed=true]/key:translate-y-[2px] group-data-[pressed=true]/key:duration-50 group-data-[pressed=true]/key:[--depth:0.5px]",
);
export const KEY_BUTTON =
  "group/key cursor-pointer rounded-[8px] pb-[3px] outline-none focus-visible:ring-2 focus-visible:ring-default";
export const GHOST_BUTTON =
  "h-7 shrink-0 cursor-pointer rounded-[8px] px-2.5 text-[13px] font-medium text-secondary outline-none transition-colors hover:bg-surface-tertiary hover:text-primary focus-visible:ring-2 focus-visible:ring-default";
