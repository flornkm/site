import { cn } from "@/lib/utils";
import { MotionConfig, motion } from "motion/react";
import { useRef, useState } from "react";
import { DemoFrame, ModeSwitch, TITLE } from "./demo-frame";

/* A two-column board. Grabbed by a corner, a card in the snapping version leaps so its centre sits
   under the cursor on the first frame; the other keeps the spot you grabbed under the cursor for
   the whole drag. Let go, and the card settles into the column under the cursor. */

type Mode = "snap" | "offset";
const MODES: { value: Mode; label: string }[] = [
  { value: "snap", label: "Snaps" },
  { value: "offset", label: "Keeps offset" },
];

type ColumnId = "todo" | "done";
const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: "todo", title: "To do" },
  { id: "done", title: "Done" },
];

const CARDS: Record<string, string> = {
  changelog: "Write the changelog",
  demo: "Record the demo",
  pricing: "Update the pricing page",
};

// `over` is the column a drop would land in, `height` sizes its preview slot.
type Drag = { id: string; x: number; y: number; height: number; over: ColumnId | undefined };

// A shade darker than the column, for the slot a drop would land in.
const PREVIEW = "rounded-[10px] bg-black/[0.05] dark:bg-white/[0.05]";

export function DragOffset() {
  const [mode, setMode] = useState<Mode>("snap");
  const [columns, setColumns] = useState<Record<ColumnId, string[]>>({
    todo: ["changelog", "demo"],
    done: ["pricing"],
  });
  const [drag, setDrag] = useState<Drag | null>(null);
  // Bumped on every drop, so the card settles even when it lands back in its own column.
  const [drops, setDrops] = useState(0);
  const columnRefs = useRef<Partial<Record<ColumnId, HTMLDivElement | null>>>({});
  // Where the press happened and the offset the card started at. A ref so the first move after the
  // press never reads a stale render.
  const press = useRef<{
    id: string;
    x: number;
    y: number;
    dx: number;
    dy: number;
    height: number;
  } | null>(null);

  function columnAt(clientX: number) {
    return COLUMNS.find(({ id }) => {
      const rect = columnRefs.current[id]?.getBoundingClientRect();
      return rect && clientX >= rect.left && clientX <= rect.right;
    })?.id;
  }

  function onPointerDown(id: string, event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    // Snapping puts the card's centre under the cursor straight away.
    const dx = mode === "snap" ? event.clientX - (rect.left + rect.width / 2) : 0;
    const dy = mode === "snap" ? event.clientY - (rect.top + rect.height / 2) : 0;
    press.current = { id, x: event.clientX, y: event.clientY, dx, dy, height: rect.height };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ id, x: dx, y: dy, height: rect.height, over: columnAt(event.clientX) });
    event.preventDefault();
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const start = press.current;
    if (!start) return;
    setDrag({
      id: start.id,
      x: start.dx + event.clientX - start.x,
      y: start.dy + event.clientY - start.y,
      height: start.height,
      over: columnAt(event.clientX),
    });
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const start = press.current;
    if (!start) return;
    press.current = null;
    const target = columnAt(event.clientX);
    if (target && !columns[target].includes(start.id)) {
      setColumns((current) => {
        const next = { todo: [...current.todo], done: [...current.done] };
        for (const column of COLUMNS) {
          next[column.id] = next[column.id].filter((card) => card !== start.id);
        }
        next[target].push(start.id);
        return next;
      });
    }
    setDrag(null);
    setDrops((count) => count + 1);
  }

  return (
    <DemoFrame>
      <MotionConfig
        reducedMotion="user"
        transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
      >
        <div className="w-full max-w-[400px]">
          <p className={TITLE}>Website launch</p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {COLUMNS.map((column) => (
              <div
                key={column.id}
                ref={(el) => {
                  columnRefs.current[column.id] = el;
                }}
                className="min-h-[188px] rounded-[14px] bg-surface-tertiary p-1.5 dark:bg-surface-secondary"
              >
                <p className="flex items-baseline gap-1.5 px-2 pt-1.5 pb-2 text-[12px] font-medium text-secondary">
                  {column.title}
                  <span className="text-quaternary tabular-nums">{columns[column.id].length}</span>
                </p>
                <div className="flex flex-col gap-1.5">
                  {columns[column.id].map((id) => {
                    const held = drag?.id === id;
                    return (
                      // Over its own column, the slot the card left shows where it will return.
                      <div
                        key={id}
                        className={cn("rounded-[10px]", held && drag.over === column.id && PREVIEW)}
                      >
                        {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- a pointer-only drag demo */}
                        <motion.div
                          layout
                          // Carries the settle across columns, where React remounts the card.
                          layoutId={id}
                          layoutDependency={drops}
                          onPointerDown={(event) => onPointerDown(id, event)}
                          onPointerMove={onPointerMove}
                          onPointerUp={onPointerUp}
                          onPointerCancel={onPointerUp}
                          style={{
                            translate: held ? `${drag.x}px ${drag.y}px` : undefined,
                            zIndex: held ? 10 : undefined,
                          }}
                          className={cn(
                            "relative touch-none rounded-[10px] bg-surface px-3 py-2.5 text-[13px] leading-[18px] text-primary select-none dark:bg-surface-tertiary",
                            "transition-shadow duration-200 ease-out",
                            held
                              ? "cursor-grabbing smooth-shadow-ring-md"
                              : "cursor-grab smooth-shadow-ring-xs",
                          )}
                        >
                          {CARDS[id]}
                        </motion.div>
                      </div>
                    );
                  })}
                  {drag && drag.over === column.id && !columns[column.id].includes(drag.id) && (
                    <motion.div
                      aria-hidden
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      style={{ height: drag.height }}
                      className={PREVIEW}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </MotionConfig>

      <ModeSwitch label="Dragging" modes={MODES} value={mode} onChange={setMode} />
    </DemoFrame>
  );
}
