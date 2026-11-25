import { TurnHint } from "@/features/gifts/components/card-scene";
import type { CardSize } from "@/features/gifts/lib/layout";
import type { GiftCover } from "@/features/gifts/lib/seal";
import { useDarkScheme } from "@/features/gifts/lib/use-dark-scheme";
import { useFlipGesture } from "@/features/gifts/lib/use-flip-gesture";
import { drawBack, drawFront } from "@/features/gifts/print/faces";
import { loadPaperAssets } from "@/features/gifts/print/paper";
import { DEFAULT_HINT, type Gift } from "@/features/gifts/types";
import { motion, useTransform } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

const SHADOW =
  "shadow-[0_0.5px_1px_rgba(0,0,0,0.1),0_3px_10px_-2px_rgba(0,0,0,0.1)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.6),0_4px_14px_-2px_rgba(0,0,0,0.5)]";

// Without WebGL: the same printed faces on a CSS 3D card.
export function CssCard({
  size,
  cover,
  gift,
  year,
  children,
}: {
  size: CardSize;
  cover: GiftCover;
  gift: Gift | null;
  year: string;
  children?: ReactNode;
}) {
  const { width, height } = size;
  const [faces, setFaces] = useState<{ front: string; back: string } | null>(null);
  const { turn, bind } = useFlipGesture(width, gift !== null);
  const ring = useDarkScheme() ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const rotateY = useTransform(turn, (value) => value * -180);
  const lift = useTransform(turn, (value) => Math.abs(Math.sin(Math.PI * value)) * width * 0.5);

  // Printing waits on the paper images and the typeface, both outside React.
  useEffect(() => {
    let cancelled = false;
    void loadPaperAssets().then((assets) => {
      if (cancelled) return;
      const face = { w: width, h: height, scale: Math.min(window.devicePixelRatio, 2), ring };
      setFaces({
        front: drawFront(cover, face, assets).toDataURL("image/webp", 0.92),
        back: drawBack(cover, gift, year, face, assets).toDataURL("image/webp", 0.92),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [width, height, cover, gift, year, ring]);

  return (
    <motion.div
      className="grid size-full place-items-center perspective-[2400px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: faces ? 1 : 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="relative transform-3d" style={{ width, height }}>
        <motion.div className="absolute inset-0 transform-3d" style={{ rotateY, z: lift }}>
          {faces ? (
            <>
              <img
                src={faces.front}
                alt=""
                draggable={false}
                className={`absolute inset-0 size-full backface-hidden ${SHADOW}`}
              />
              <img
                src={faces.back}
                alt=""
                draggable={false}
                className={`absolute inset-0 size-full rotate-y-180 backface-hidden ${SHADOW}`}
              />
            </>
          ) : null}
        </motion.div>
        <div
          {...bind}
          className="absolute inset-0 cursor-grab touch-none outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-primary active:cursor-grabbing aria-disabled:cursor-default"
        />
        {gift ? <TurnHint text={gift.hint ?? DEFAULT_HINT} aside={size.aside} /> : null}
        {children}
      </div>
    </motion.div>
  );
}
