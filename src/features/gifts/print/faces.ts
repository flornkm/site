import {
  SERIF,
  TILE,
  createSheet,
  finishSheet,
  luminance,
  type PaperAssets,
} from "@/features/gifts/print/paper";
import type { GiftCover } from "@/features/gifts/lib/seal";
import type { Gift } from "@/features/gifts/types";

// The two printed faces of the card. One stock, one ink, one size of one italic: hierarchy
// comes only from where things sit on the grid and a lighter tint for labels.

// `ring`: a 1px hairline just inside the edge, so the card holds its outline against the
// page in either theme (black at 10% in light, white at 10% in dark).
export type FaceSize = { w: number; h: number; scale: number; ring: string };

const LABEL_ALPHA = 0.55;

// The one text size: 3% of the card's width, never under 11px on screen.
const typeSize = (w: number) => Math.max(11, (3 * w) / 100);

// Six columns inside a margin, on a baseline grid of the text size. Positions are in CSS px
// of the face.
function grid(w: number, h: number, size = typeSize(w)) {
  const unit = w / 100;
  const leading = Math.round(size * 1.38 * 2) / 2;
  const margin = 7 * unit;
  const gutter = 2.4 * unit;
  const column = (w - 2 * margin - 5 * gutter) / 6;
  const x = (col: number) => margin + col * (column + gutter);
  const span = (from: number, to: number) => x(to) + column - x(from);
  // The first baseline sits one cap height under the top margin, the last on the bottom one.
  const top = margin + size * 0.7;
  const rows = Math.floor((h - margin - top) / leading);
  const baseline = (row: number) => top + row * leading;
  return { size, leading, margin, x, span, rows, baseline, w, h };
}

// A word wider than the column (a link, a long code) is broken where it has to be.
function splitLong(ctx: CanvasRenderingContext2D, word: string, maxWidth: number): string[] {
  const parts: string[] = [];
  let part = "";
  for (const char of word) {
    if (part && ctx.measureText(part + char).width > maxWidth) {
      parts.push(part);
      part = "";
    }
    part += char;
  }
  return [...parts, part];
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  const words = text.split(/\s+/).flatMap((word) => splitLong(ctx, word, maxWidth));
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return pretty(ctx, lines, maxWidth);
}

// Like CSS text-wrap: pretty. A paragraph never ends on a lone word or a stub of a line:
// words move down from the line above until the last line holds its own.
function pretty(ctx: CanvasRenderingContext2D, lines: string[], maxWidth: number): string[] {
  const out = [...lines];
  for (let moves = 0; moves < 3 && out.length > 1; moves++) {
    const last = out[out.length - 1];
    const above = out[out.length - 2].split(" ");
    if (above.length < 3) break;
    if (last.includes(" ") && ctx.measureText(last).width >= maxWidth / 3) break;
    const moved = `${above[above.length - 1]} ${last}`;
    if (ctx.measureText(moved).width > maxWidth) break;
    out[out.length - 2] = above.slice(0, -1).join(" ");
    out[out.length - 1] = moved;
  }
  return out;
}

function ring(ctx: CanvasRenderingContext2D, { w, h, ring }: FaceSize) {
  ctx.strokeStyle = ring;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

// A soft halo around the type, so it lifts off the textured stock: a shade of the paper for
// light ink, a light one for dark ink. Canvas shadows ignore the transform, so blur and
// offset are given in device pixels.
function setType(ctx: CanvasRenderingContext2D, size: number, cover: GiftCover) {
  ctx.font = `italic 400 ${size}px ${SERIF}`;
  ctx.fillStyle = cover.ink;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const scale = ctx.getTransform().a;
  const lightInk = luminance(cover.ink) > luminance(cover.paper);
  ctx.shadowColor = lightInk ? "rgba(0,0,0,0.32)" : "rgba(255,255,255,0.55)";
  ctx.shadowBlur = size * 0.28 * scale;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = size * 0.04 * scale;
}

// The link preview prints the title larger (it's seen small in a chat) and centred in its
// frame rather than on the card, which runs off the bottom there, and the paper's grain
// larger, as a close-up of the card would show it.
export type FrontOptions = { titleScale?: number; titleCentre?: number; grain?: number };

export function drawFront(
  cover: GiftCover,
  face: FaceSize,
  assets: PaperAssets,
  { titleScale = 1, titleCentre, grain = 1 }: FrontOptions = {},
) {
  const { w, h } = face;
  const sheet = createSheet(w, h, face.scale, cover.paper);
  const { ctx } = sheet;
  const size = typeSize(w) * titleScale;
  setType(ctx, size, cover);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = wrap(ctx, cover.title, w * 0.84);
  const leading = size * 1.05;
  lines.forEach((line, index) => {
    ctx.fillText(line, w / 2, (titleCentre ?? h / 2) + (index - (lines.length - 1) / 2) * leading);
  });
  finishSheet(sheet, cover.paper, 0, assets, TILE * grain);
  ring(ctx, face);
  return sheet.canvas;
}

// Before the password the back is blank stock: nothing of the message exists yet.
export function drawBack(
  cover: GiftCover,
  gift: Gift | null,
  year: string,
  size: FaceSize,
  assets: PaperAssets,
) {
  const sheet = createSheet(size.w, size.h, size.scale, cover.paper);
  if (gift) printBack(sheet.ctx, cover, gift, year, size);
  finishSheet(sheet, cover.paper, 1, assets);
  ring(sheet.ctx, size);
  return sheet.canvas;
}

// Headline and year across the top row; the message in the right four columns from a
// little above the middle, the recipient beside its first line; the gift in the same
// columns on the bottom margin, labelled beside it. On a small card a long message won't
// fit at the usual size, so the type steps down until everything sits in its place.
function printBack(
  ctx: CanvasRenderingContext2D,
  cover: GiftCover,
  gift: Gift,
  year: string,
  { w, h }: FaceSize,
) {
  for (let size = typeSize(w); ; size -= 0.25) {
    const g = grid(w, h, size);
    setType(ctx, g.size, cover);
    const layout = layBack(ctx, gift, year, g);
    if (layout.fits || size <= 8) {
      layout.draw();
      return;
    }
  }
}

function layBack(
  ctx: CanvasRenderingContext2D,
  gift: Gift,
  year: string,
  g: ReturnType<typeof grid>,
) {
  const body = g.span(2, 5);
  const labelSpan = g.span(0, 1);
  const width = (text: string) => ctx.measureText(text).width;

  const giftLines = gift.gift
    ? [...wrap(ctx, gift.gift.detail, body), ...(gift.gift.code ? [gift.gift.code] : [])]
    : [];
  const giftRow = g.rows - giftLines.length + 1;

  // Paragraphs separated by an empty line, the signature after another.
  const blocks = [...gift.back.message, gift.back.signature].map((text) => wrap(ctx, text, body));
  const bodyRows = blocks.reduce((sum, lines) => sum + lines.length, 0) + blocks.length - 1;
  const lastFree = (gift.gift ? giftRow - 2 : g.rows) - bodyRows + 1;
  const start = Math.max(2, Math.min(Math.round(g.rows * 0.36), lastFree));

  const labels = [gift.recipient, ...(gift.gift ? [gift.gift.label] : [])];
  const fits =
    lastFree >= 2 &&
    labels.every((text) => width(text) <= labelSpan) &&
    width(gift.back.headline) + width(year) + g.span(0, 0) <= g.w - 2 * g.margin;

  function draw() {
    const label = (text: string, row: number) => {
      ctx.globalAlpha = LABEL_ALPHA;
      ctx.fillText(text, g.x(0), g.baseline(row));
      ctx.globalAlpha = 1;
    };
    ctx.fillText(gift.back.headline, g.x(0), g.baseline(0));
    ctx.globalAlpha = LABEL_ALPHA;
    ctx.textAlign = "right";
    ctx.fillText(year, g.w - g.margin, g.baseline(0));
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;

    giftLines.forEach((line, index) => ctx.fillText(line, g.x(2), g.baseline(giftRow + index)));
    if (gift.gift) label(gift.gift.label, giftRow);

    let row = start;
    for (const lines of blocks) {
      for (const line of lines) ctx.fillText(line, g.x(2), g.baseline(row++));
      row++;
    }
    label(gift.recipient, start);
  }

  return { fits, draw };
}
