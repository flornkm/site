import { ImageResponse } from "@vercel/og";
import { createElement as h } from "react";
import sharp from "sharp";
import { TILE, luminance, paperStrength, typeSize } from "../../src/features/gifts/print/paper";

// A gift's link preview, drawn from its front alone (paper, ink, title): the top of the
// card close up, rising out of the bottom of the frame. Printed like the card itself, the
// title with its halo first, then the baked paper texture over everything, soft-light
// tone and multiplied flecks, the way print/paper.ts finishes a sheet in the browser.

export type PreviewCover = { paper: string; ink: string; title: string };
export type TextureName = "tone" | "fine" | "flecks";

const WIDTH = 1200;
const HEIGHT = 630;
// Rendered at twice the size crawlers ask for, so it stays sharp on high-density screens.
const SCALE = 2;
const CARD_WIDTH = 700;
const CARD_TOP = 58;
const BACKGROUND = "#fdfdfd";
// Seen at a few hundred pixels wide in a chat: the title larger than on the card, and the
// grain too, as in a close-up.
const TITLE_SCALE = 1.7;
const GRAIN = 2.4;

const px = (value: number) => Math.round(value * SCALE);

async function loadFont(): Promise<ArrayBuffer> {
  const res = await fetch("https://cdn.floriankiem.com/fonts/wagram/v1/Wagram-Italic.woff");
  if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
  return res.arrayBuffer();
}

let fontPromise: Promise<ArrayBuffer> | null = null;

// The title printed on plain stock, its halo as on the card (print/faces.ts setType).
async function printTitle(cover: PreviewCover, width: number, height: number) {
  fontPromise ??= loadFont().catch((error) => {
    fontPromise = null;
    throw error;
  });
  const size = typeSize(CARD_WIDTH) * TITLE_SCALE * SCALE;
  const lightInk = luminance(cover.ink) > luminance(cover.paper);
  const halo = lightInk ? "rgba(0,0,0,0.32)" : "rgba(255,255,255,0.55)";
  const image = new ImageResponse(
    h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: cover.paper,
        },
      },
      h(
        "div",
        {
          style: {
            fontFamily: "Wagram",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: size,
            lineHeight: 1.05,
            color: cover.ink,
            textAlign: "center",
            maxWidth: width * 0.84,
            textShadow: `0 ${size * 0.04}px ${size * 0.28}px ${halo}`,
          },
        },
        cover.title,
      ),
    ),
    {
      width,
      height,
      fonts: [{ name: "Wagram", data: await fontPromise, weight: 400, style: "italic" }],
    },
  );
  return Buffer.from(await image.arrayBuffer());
}

// One texture at the preview's grain, cut to the card, as raw RGBA.
async function texture(
  read: (name: TextureName) => Promise<Buffer>,
  name: TextureName,
  width: number,
  height: number,
) {
  const tile = px(TILE * GRAIN);
  return sharp(await read(name))
    .resize(tile, tile)
    .extract({ left: 0, top: 0, width, height })
    .ensureAlpha()
    .raw()
    .toBuffer();
}

// W3C soft-light, on sRGB values in 0..1: what canvas "soft-light" does.
function softLight(backdrop: number, source: number) {
  if (source <= 0.5) return backdrop - (1 - 2 * source) * backdrop * (1 - backdrop);
  const d =
    backdrop <= 0.25 ? ((16 * backdrop - 12) * backdrop + 4) * backdrop : Math.sqrt(backdrop);
  return backdrop + (2 * source - 1) * (d - backdrop);
}

// Blends a texture over the card in place, exactly as the browser's canvas does with
// globalAlpha and a blend mode: in sRGB, mixed back by the source's alpha. (libvips blends
// differently, which printed the paper darker and flatter than the card.)
function blend(
  card: Buffer,
  layer: Buffer,
  strength: number,
  mode: (backdrop: number, source: number) => number,
) {
  for (let i = 0, j = 0; i < card.length; i += 3, j += 4) {
    const alpha = (layer[j + 3] / 255) * strength;
    if (alpha === 0) continue;
    for (let c = 0; c < 3; c++) {
      const backdrop = card[i + c] / 255;
      const mixed = mode(backdrop, layer[j + c] / 255);
      card[i + c] = Math.round(255 * (backdrop + alpha * (mixed - backdrop)));
    }
  }
}

export async function renderGiftPreview(
  cover: PreviewCover,
  readTexture: (name: TextureName) => Promise<Buffer>,
): Promise<Buffer> {
  const width = px(CARD_WIDTH);
  const height = px(HEIGHT - CARD_TOP);
  const strength = paperStrength(cover.paper);

  const [title, tone, flecks] = await Promise.all([
    printTitle(cover, width, height),
    texture(readTexture, strength.pale ? "fine" : "tone", width, height),
    texture(readTexture, "flecks", width, height),
  ]);
  const paper = await sharp(title).removeAlpha().raw().toBuffer();
  blend(paper, tone, strength.tone, softLight);
  blend(paper, flecks, strength.flecks, (backdrop, source) => backdrop * source);

  // A 1px hairline just inside the edge, as on the card in light mode.
  const ring = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<rect x="${SCALE / 2}" y="${SCALE / 2}" width="${width - SCALE}" height="${height + SCALE}" ` +
      `fill="none" stroke="rgba(0,0,0,0.1)" stroke-width="${SCALE}"/></svg>`,
  );
  const card = await sharp(paper, { raw: { width, height, channels: 3 } })
    .composite([{ input: ring }])
    .png()
    .toBuffer();

  // The contact shadow of the card lying on the table, light from the upper left: a wide
  // faint one leaning away from the light and a tight line where paper meets table.
  const left = px((WIDTH - CARD_WIDTH) / 2);
  const top = px(CARD_TOP);
  const shadow = (sigma: number, dx: number, dy: number, id: string) =>
    `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%">` +
    `<feGaussianBlur stdDeviation="${px(sigma)}"/></filter>` +
    `<rect x="${left + px(dx)}" y="${top + px(dy)}" width="${width}" height="${height * 2}" ` +
    `fill="rgba(0,0,0,0.1)" filter="url(#${id})"/>`;
  const shadows = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px(WIDTH)}" height="${px(HEIGHT)}">` +
      shadow(11, 4, 7, "wide") +
      shadow(1, 0.6, 1, "tight") +
      `</svg>`,
  );

  return sharp({
    create: { width: px(WIDTH), height: px(HEIGHT), channels: 3, background: BACKGROUND },
  })
    .composite([{ input: shadows }, { input: card, left, top }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
