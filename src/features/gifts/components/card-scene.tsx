import type { CardSize } from "@/features/gifts/lib/layout";
import type { GiftCover } from "@/features/gifts/lib/seal";
import { useDarkScheme } from "@/features/gifts/lib/use-dark-scheme";
import { useFlipGesture } from "@/features/gifts/lib/use-flip-gesture";
import { drawBack, drawFront } from "@/features/gifts/print/faces";
import { loadPaperAssets, type PaperAssets } from "@/features/gifts/print/paper";
import { DEFAULT_HINT, type Gift } from "@/features/gifts/types";
import { CardRenderer } from "@/features/gifts/webgl/card-renderer";
import { cn } from "@/lib/utils";
import { motion, useMotionValueEvent } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

// The lit WebGL card filling the page, with an invisible hit area over the card. Both faces
// are printed to canvases (print/faces.ts) and handed to the renderer.
export function CardScene({
  size,
  cover,
  gift,
  year,
  lightAngle,
  onUnsupported,
  children,
}: {
  size: CardSize;
  cover: GiftCover;
  gift: Gift | null;
  year: string;
  lightAngle: number;
  onUnsupported: () => void;
  // Shown under the card (the password field).
  children?: ReactNode;
}) {
  const { width, height } = size;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CardRenderer | null>(null);
  const [assets, setAssets] = useState<PaperAssets | null>(null);
  const [ready, setReady] = useState(false);
  const { turn, bind } = useFlipGesture(width, gift !== null);
  const ring = useDarkScheme() ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  // The renderer is an external system: created once per canvas, fed below.
  useEffect(() => {
    let renderer: CardRenderer;
    try {
      renderer = new CardRenderer(canvasRef.current!, lightAngle);
    } catch {
      onUnsupported();
      return;
    }
    rendererRef.current = renderer;
    const resize = () =>
      renderer.setViewport(window.innerWidth, window.innerHeight, window.devicePixelRatio);
    resize();
    window.addEventListener("resize", resize);
    let cancelled = false;
    void loadPaperAssets().then((loaded) => !cancelled && setAssets(loaded));
    return () => {
      cancelled = true;
      window.removeEventListener("resize", resize);
      renderer.dispose();
      rendererRef.current = null;
    };
    // lightAngle and onUnsupported are fixed for the page's life.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !assets) return;
    const face = { w: width, h: height, scale: Math.min(window.devicePixelRatio, 2) * 1.5, ring };
    renderer.setCard(width, height, cover.paper);
    renderer.setFaces(drawFront(cover, face, assets), drawBack(cover, gift, year, face, assets));
    renderer.setTurn(turn.get());
    setReady(true);
  }, [assets, width, height, cover, gift, year, turn, ring]);

  useMotionValueEvent(turn, "change", (value) => rendererRef.current?.setTurn(value));

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: ready ? 1 : 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full" />
      <div className="grid size-full place-items-center">
        <div className="relative" style={{ width, height }}>
          <div
            {...bind}
            className="absolute inset-0 cursor-grab touch-none outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-primary active:cursor-grabbing aria-disabled:cursor-default"
          />
          {gift ? <TurnHint text={gift.hint ?? DEFAULT_HINT} aside={size.aside} /> : null}
          {children}
        </div>
      </div>
    </motion.div>
  );
}

export function TurnHint({ text, aside }: { text: string; aside: boolean }) {
  return (
    <motion.p
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute text-sm text-pretty text-tertiary",
        aside
          ? "top-1/2 left-full ml-8 w-[calc(50vw-50%-3rem)] -translate-y-1/2"
          : "inset-x-0 top-full mt-12 text-center",
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.6 }}
    >
      {text}
    </motion.p>
  );
}
