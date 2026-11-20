import { cn } from "@/lib/utils";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Body3 } from "../design-system/body";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <BaseTooltip.Provider delay={150} closeDelay={0} timeout={100}>
      {children}
    </BaseTooltip.Provider>
  );
}

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  // Controlled visibility for non-hover triggers (e.g. shown while dragging). Omit for
  // the default hover behavior.
  open?: boolean;
  onOpenChange?: React.ComponentProps<typeof BaseTooltip.Root>["onOpenChange"];
  // Wraps the trigger in a span instead of a div, for something sitting inside a paragraph:
  // a div there ends the <p> early and splits the sentence into two in the DOM.
  inline?: boolean;
}

export default function Tooltip({
  children,
  content,
  className,
  style,
  open,
  onOpenChange,
  inline,
}: TooltipProps) {
  return (
    <BaseTooltip.Root open={open} onOpenChange={onOpenChange}>
      <BaseTooltip.Trigger
        // Two branches rather than one dynamic tag: a "span" | "div" union intersects the two
        // prop types, and their refs have no common assignment, so every prop types as `never`.
        render={(triggerProps) => {
          const wrapperClass = cn(
            "relative",
            // A span is inline by default, which would collapse around a grid child.
            inline && "inline-flex",
            className,
            triggerProps.className,
          );

          if (inline) {
            return (
              <span
                {...(triggerProps as React.HTMLAttributes<HTMLSpanElement> & {
                  ref?: React.Ref<HTMLSpanElement>;
                })}
                className={wrapperClass}
                style={style}
              >
                {children}
              </span>
            );
          }

          return (
            <div
              {...(triggerProps as React.HTMLAttributes<HTMLDivElement> & {
                ref?: React.Ref<HTMLDivElement>;
              })}
              className={wrapperClass}
              style={style}
            >
              {children}
            </div>
          );
        }}
      />
      <BaseTooltip.Portal>
        {/* z on the Positioner, not the Popup: the Positioner places itself with a
            transform, which traps any child z-index in its own stacking context —
            a z'd Popup would still paint behind a z-[110] dialog. */}
        <BaseTooltip.Positioner sideOffset={8} className="z-[150]">
          {/* No z-index here on purpose: the Positioner's own z-index makes it a stacking
              context, so a number on its only child has nothing left to be ranked against. */}
          <BaseTooltip.Popup
            className={cn(
              "font-medium bg-surface-inverted text-inverted px-2 py-1 rounded-lg",
              "origin-[var(--transform-origin)]",
              "transition-all duration-150 ease-out",
              "data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:translate-y-1",
              "data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:translate-y-1",
            )}
          >
            <Body3 className="text-inverted whitespace-nowrap">{content}</Body3>
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

const easing = "cubic-bezier(0.1,1,0.36,1)";

interface TooltipGroupProps {
  children: React.ReactNode;
}

interface TooltipTriggerProps {
  children: React.ReactNode;
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

const TooltipGroupContext = createContext<BaseTooltip.Handle<React.ComponentType> | null>(null);

export function TooltipGroup({ children }: TooltipGroupProps) {
  const handle = useMemo(() => BaseTooltip.createHandle<React.ComponentType>(), []);

  return (
    <>
      <TooltipGroupContext.Provider value={handle}>{children}</TooltipGroupContext.Provider>

      <BaseTooltip.Root handle={handle}>
        {({ payload: Payload }) => (
          <BaseTooltip.Portal>
            <BaseTooltip.Positioner
              sideOffset={8}
              className={cn(
                "z-[150] h-[var(--positioner-height)] w-[var(--positioner-width)]",
                "max-w-[var(--available-width)]",
                "transition-[top,left,right,bottom,transform]",
                `duration-[0.1s] ease-[${easing}]`,
                "data-[instant]:transition-none",
              )}
            >
              <BaseTooltip.Popup
                className={cn(
                  "relative font-medium bg-surface-inverted text-inverted rounded-lg",
                  "h-[var(--popup-height,auto)] w-[var(--popup-width,auto)]",
                  `origin-[var(--transform-origin)]`,
                  `transition-[width,height,opacity,scale] duration-[0.1s] ease-[${easing}]`,
                  "data-[starting-style]:opacity-0 data-[starting-style]:scale-90",
                  "data-[ending-style]:opacity-0 data-[ending-style]:scale-90",
                  "data-[instant]:transition-none",
                )}
              >
                <BaseTooltip.Viewport
                  className={cn(
                    "[--vip:0.5rem]",
                    "relative h-full w-full overflow-clip",
                    "px-[var(--vip)] py-1",
                    "[&_[data-current]]:w-[calc(var(--popup-width)-2*var(--vip))]",
                    "[&_[data-current]]:translate-x-0 [&_[data-current]]:opacity-100",
                    `[&_[data-current]]:transition-[translate,opacity] [&_[data-current]]:duration-[250ms,175ms] [&_[data-current]]:ease-[${easing}]`,
                    "[&_[data-previous]]:w-[calc(var(--popup-width)-2*var(--vip))]",
                    "[&_[data-previous]]:translate-x-0 [&_[data-previous]]:opacity-100",
                    `[&_[data-previous]]:transition-[translate,opacity] [&_[data-previous]]:duration-[250ms,175ms] [&_[data-previous]]:ease-[${easing}]`,
                    "data-[activation-direction~='left']:[&_[data-current][data-starting-style]]:-translate-x-1/2",
                    "data-[activation-direction~='left']:[&_[data-current][data-starting-style]]:opacity-0",
                    "data-[activation-direction~='right']:[&_[data-current][data-starting-style]]:translate-x-1/2",
                    "data-[activation-direction~='right']:[&_[data-current][data-starting-style]]:opacity-0",
                    "data-[activation-direction~='left']:[&_[data-previous][data-ending-style]]:translate-x-1/2",
                    "data-[activation-direction~='left']:[&_[data-previous][data-ending-style]]:opacity-0",
                    "data-[activation-direction~='right']:[&_[data-previous][data-ending-style]]:-translate-x-1/2",
                    "data-[activation-direction~='right']:[&_[data-previous][data-ending-style]]:opacity-0",
                    "[[data-instant]_&_[data-previous]]:transition-none",
                    "[[data-instant]_&_[data-current]]:transition-none",
                  )}
                >
                  {Payload !== undefined && <Payload />}
                </BaseTooltip.Viewport>
              </BaseTooltip.Popup>
            </BaseTooltip.Positioner>
          </BaseTooltip.Portal>
        )}
      </BaseTooltip.Root>
    </>
  );
}

export function TooltipTrigger({ children, content, className, style }: TooltipTriggerProps) {
  const handle = useContext(TooltipGroupContext);
  if (!handle) {
    throw new Error("TooltipTrigger must be used inside a TooltipGroup");
  }

  const ContentComponent = useMemo(() => {
    return function TooltipContent() {
      return <Body3 className="text-inverted whitespace-nowrap">{content}</Body3>;
    };
  }, [content]);

  return (
    <BaseTooltip.Trigger
      handle={handle}
      payload={ContentComponent}
      render={(triggerProps) => (
        <div
          {...(triggerProps as React.HTMLAttributes<HTMLDivElement> & {
            ref?: React.Ref<HTMLDivElement>;
          })}
          className={cn("relative", className, triggerProps.className)}
          style={style}
        >
          {children}
        </div>
      )}
    />
  );
}

interface RichTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
  maxWidth?: number;
}

export function RichTooltip({ children, content, className, maxWidth = 360 }: RichTooltipProps) {
  const [open, setOpen] = useState(false);
  const touchOpenedRef = useRef(false);
  const id = useId();

  // Close this tooltip when another one opens (isolation)
  useEffect(() => {
    const handleCloseOthers = ((e: CustomEvent<string>) => {
      if (e.detail !== id && touchOpenedRef.current) {
        touchOpenedRef.current = false;
        setOpen(false);
      }
    }) as EventListener;

    document.addEventListener("rich-tooltip-open", handleCloseOthers);
    return () => document.removeEventListener("rich-tooltip-open", handleCloseOthers);
  }, []);

  // Close on outside tap when touch-opened
  useEffect(() => {
    if (!open || !touchOpenedRef.current) return;

    const handleOutside = (e: PointerEvent) => {
      if ((e.target as Element).closest?.("[data-rich-tooltip]")) return;
      touchOpenedRef.current = false;
      setOpen(false);
    };

    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [open]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const willOpen = !touchOpenedRef.current;
    touchOpenedRef.current = willOpen;
    setOpen(willOpen);
    if (willOpen) {
      document.dispatchEvent(new CustomEvent("rich-tooltip-open", { detail: id }));
    }
  }, []);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    // If touch-opened, ignore hover events from base-ui
    if (touchOpenedRef.current) return;
    setOpen(nextOpen);
  }, []);

  return (
    <BaseTooltip.Root open={open} onOpenChange={handleOpenChange}>
      <BaseTooltip.Trigger
        render={(triggerProps) => (
          <span
            {...(triggerProps as React.HTMLAttributes<HTMLSpanElement> & {
              ref?: React.Ref<HTMLSpanElement>;
            })}
            data-rich-tooltip
            tabIndex={0}
            onTouchEnd={handleTouchEnd}
            className={cn(
              "underline decoration-muted underline-offset-2 hover:decoration-emphasis/50 cursor-context-menu transition-colors duration-200 outline-none focus-visible:decoration-emphasis/50",
              className,
              triggerProps.className,
            )}
          >
            {children}
          </span>
        )}
      />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner sideOffset={12} className="z-[150]">
          <BaseTooltip.Popup
            data-rich-tooltip
            className={cn(
              "bg-primary border border-primary rounded-lg shadow-lg p-3 overflow-hidden",
              "origin-[var(--transform-origin)]",
              "transition-all duration-100 ease-out",
              "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
              "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            )}
            style={{ maxWidth }}
          >
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
