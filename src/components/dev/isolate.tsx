import Tooltip from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { IconArrowUpRight } from "central-icons/IconArrowUpRight";
import { type ReactNode, type Ref, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

/* Dev only: an arrow on every demo and experiment opens it alone in a new tab, centred at the size
   it has on the page over a plain white background, for screen recordings. The new tab is the same
   page with #isolate=<id>; a hash, so neither the router's search validation nor SSR sees it.
   Render these behind `import.meta.env.DEV` so none of it ships. */

function readTarget() {
  return new URLSearchParams(window.location.hash.slice(1)).get("isolate");
}

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function useIsolateTarget(): string | null {
  return useSyncExternalStore(subscribe, readTarget, () => null);
}

// Styled like the copy button on code blocks.
export function IsolateButton({ id, className }: { id: string; className?: string }) {
  return (
    <Tooltip content="Open alone" className={cn("not-prose z-20", className)}>
      <button
        type="button"
        aria-label="Open alone in a new tab"
        // The bare path: the query could reopen a dialog behind the isolated view.
        onClick={() =>
          window.open(`${window.location.pathname}#isolate=${encodeURIComponent(id)}`, "_blank")
        }
        className={cn(
          "grid size-6 shrink-0 cursor-pointer place-items-center",
          "rounded-lg text-quaternary transition-colors hover:bg-black/5 hover:text-tertiary dark:hover:bg-white/6",
          "active:bg-black/8 active:duration-0 dark:active:bg-white/9",
          "outline-none focus-visible:ring-2 focus-visible:ring-default",
          "touch-manipulation select-none",
        )}
      >
        <IconArrowUpRight aria-hidden className="size-4" />
      </button>
    </Tooltip>
  );
}

// `data-block-scroll` locks the page underneath (see globals.css).
export function IsolatedStage({
  children,
  ref,
}: {
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      data-block-scroll
      className="fixed inset-0 z-[1000] grid place-items-center bg-white"
    >
      {children}
    </div>
  );
}

// Top-level article figures are the demos; images opt out with `data-no-isolate`.
function collectFigures(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>("figure.not-prose:not([data-no-isolate])")].filter(
    (figure) => !figure.parentElement?.closest("figure"),
  );
}

/* Wraps an article's content. Each demo figure gets the arrow, and with #isolate=<n> the nth one is
   lifted out of the article onto the stage at the width it had in the column, its frame outline
   dropped. The figures belong to the MDX tree, so they are found in the DOM, not passed in. */
export function DemoIsolation({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [figures, setFigures] = useState<HTMLElement[]>([]);
  const target = useIsolateTarget();

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const sync = () =>
      setFigures((current) => {
        const next = collectFigures(element);
        const same = next.length === current.length && next.every((f, i) => f === current[i]);
        return same ? current : next;
      });
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(element, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const isolated = target === null ? undefined : figures[Number(target)];

  // Buttons need a positioned figure to sit in its corner.
  useEffect(() => {
    if (isolated) return;
    const lifted = figures.filter((figure) => getComputedStyle(figure).position === "static");
    for (const figure of lifted) figure.style.position = "relative";
    return () => {
      for (const figure of lifted) figure.style.position = "";
    };
  }, [figures, isolated]);

  useEffect(() => {
    if (!isolated) return;
    const previous = isolated.getAttribute("style");
    const { width } = isolated.getBoundingClientRect();
    Object.assign(isolated.style, {
      position: "fixed",
      inset: "0",
      margin: "auto",
      width: `${width}px`,
      height: "fit-content",
      zIndex: "1001",
      outline: "none",
    });
    // Controls pinned to the frame's bottom with mt-auto (mode toggles, keycaps) move up to sit a
    // fixed gap under the demo. The height is then locked and they go back to auto, so they stay
    // put while the demo above them grows or shrinks during a recording.
    const controls = [...isolated.children].filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.classList.contains("mt-auto"),
    );
    if (controls.length > 0) {
      isolated.style.minHeight = "0px";
      for (const control of controls) control.style.marginTop = "32px";
      isolated.style.height = `${isolated.offsetHeight}px`;
      for (const control of controls) control.style.marginTop = "";
    }
    // A demo with its own background (one that switches to dark, say) paints the whole page with
    // it. Its colour is copied every frame for a moment after each class or style change, so the
    // page follows the demo's own transition instead of jumping to the end of it.
    let frame = 0;
    let until = 0;
    const copy = () => {
      const color = getComputedStyle(isolated).backgroundColor;
      if (stage.current)
        stage.current.style.backgroundColor = color === "rgba(0, 0, 0, 0)" ? "" : color;
      if (performance.now() < until) frame = requestAnimationFrame(copy);
    };
    const follow = () => {
      until = performance.now() + 600;
      cancelAnimationFrame(frame);
      copy();
    };
    follow();
    const observer = new MutationObserver(follow);
    observer.observe(isolated, { attributes: true, attributeFilter: ["class", "style"] });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      if (previous === null) isolated.removeAttribute("style");
      else isolated.setAttribute("style", previous);
    };
  }, [isolated]);

  return (
    <div ref={root}>
      {children}
      {isolated && <IsolatedStage ref={stage} />}
      {!isolated &&
        figures.map((figure, index) =>
          createPortal(
            <IsolateButton id={String(index)} className="absolute top-2 right-2" />,
            figure,
            index,
          ),
        )}
    </div>
  );
}
