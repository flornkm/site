import { drawFront } from "@/features/gifts/print/faces";
import { loadPaperAssets } from "@/features/gifts/print/paper";
import type { GiftCover } from "@/features/gifts/lib/seal";

// The link preview: the top of the card, close up, rising out of the bottom of the frame on
// the page's own background. Only what's printed on the front, so nothing is given away.
// Rendered in a headless browser by scripts/seal-gifts.ts, which calls window.drawPreview.

export const PREVIEW_WIDTH = 1200;
export const PREVIEW_HEIGHT = 630;

const BACKGROUND = "#fdfdfd";
const CARD_WIDTH = 700;
const CARD_TOP = 58;
// Printed at twice the size crawlers ask for, so it stays sharp on high-density screens.
const SCALE = 2;
// A preview is seen at a few hundred pixels wide in a chat: the title needs to be larger
// than on the card to read there. It sits in the middle of the part of the card in frame.
const TITLE_SCALE = 1.7;
// The card is shown close up here, so its fibres are too: about twice the size on the card.
const GRAIN = 2.4;

export async function drawPreview(cover: GiftCover): Promise<string> {
  const assets = await loadPaperAssets();
  const height = Math.round(CARD_WIDTH * Math.SQRT2);
  const face = drawFront(
    cover,
    { w: CARD_WIDTH, h: height, scale: SCALE, ring: "rgba(0,0,0,0.1)" },
    assets,
    { titleScale: TITLE_SCALE, titleCentre: (PREVIEW_HEIGHT - CARD_TOP) / 2, grain: GRAIN },
  );

  const canvas = document.createElement("canvas");
  canvas.width = PREVIEW_WIDTH * SCALE;
  canvas.height = PREVIEW_HEIGHT * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);

  const x = (PREVIEW_WIDTH - CARD_WIDTH) / 2;
  // The same contact shadow the card has lying on the table, light from the upper left: a
  // tight line where paper meets table and a wide faint one leaning away from the light.
  for (const [color, blur, dx, dy] of [
    ["rgba(0,0,0,0.1)", 22, 4, 7],
    ["rgba(0,0,0,0.1)", 2, 0.6, 1],
  ] as const) {
    ctx.shadowColor = color;
    // Shadow offsets and blur ignore the canvas transform.
    ctx.shadowBlur = blur * SCALE;
    ctx.shadowOffsetX = dx * SCALE;
    ctx.shadowOffsetY = dy * SCALE;
    ctx.fillStyle = cover.paper;
    ctx.fillRect(x, CARD_TOP, CARD_WIDTH, height);
  }
  ctx.shadowColor = "transparent";
  ctx.drawImage(face, x, CARD_TOP, CARD_WIDTH, height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

declare global {
  interface Window {
    drawPreview: typeof drawPreview;
  }
}

if (typeof window !== "undefined") window.drawPreview = drawPreview;
