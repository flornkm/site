// The card stock, printed to canvases. Both renderers (WebGL and the CSS fallback) show
// these same canvases, so there is one source of truth for how the paper looks.
//
// The textures are baked by scripts/gifts/bake-paper.py: tileable, scan-calibrated tone
// (felted fibres, pulp clouding, tooth), a smoother variant for pale stock, and a sparse
// layer of dark inclusions. 1024px tiles printed at 768 CSS px: a coarser, larger grain,
// still close to one texel per pixel on 2x screens.

export const TILE = 768;

export const SERIF = 'Wagram, Georgia, "Times New Roman", serif';

export type PaperAssets = {
  tone: HTMLImageElement;
  fine: HTMLImageElement;
  flecks: HTMLImageElement;
};

export type Sheet = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  // CSS px of the card face; the canvas is `scale` times larger.
  w: number;
  h: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export async function loadPaperAssets(): Promise<PaperAssets> {
  const [tone, fine, flecks] = await Promise.all([
    loadImage("/textures/gifts/paper-tone.webp"),
    loadImage("/textures/gifts/paper-fine.webp"),
    loadImage("/textures/gifts/paper-flecks.webp"),
    // Canvas text draws with whatever is loaded right now, so wait for the face first.
    document.fonts.load(`italic 400 16px ${SERIF}`),
  ]);
  return { tone, fine, flecks };
}

export function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Soft-light moves a colour by roughly L·(1−L), so the strength tuned for a mid-tone
// (against a scan of dyed uncoated stock) would leave pale stock flat. Compensate only
// partly: good white paper shows far less texture than coloured board. Flecks fade on
// pale stock, where they'd read as hairs.
function strength(hex: string) {
  const l = luminance(hex);
  return {
    pale: l > 0.6,
    tone: Math.min(1, 0.36 * (0.2475 / Math.max(l * (1 - l), 0.03)) ** 0.25),
    flecks: 0.45 * (1 - 0.75 * l),
  };
}

export function createSheet(w: number, h: number, scale: number, paper: string): Sheet {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);
  return { canvas, ctx, w, h };
}

// Tone in soft-light, flecks in multiply, over everything printed, so the ink sits in the
// paper. `side` shifts the tile so front and back don't show the same fibres; `tile` is how
// many CSS px one repeat of the texture covers.
export function finishSheet(
  sheet: Sheet,
  paper: string,
  side: number,
  assets: PaperAssets,
  tile = TILE,
) {
  const { ctx, w, h } = sheet;
  // The texture fills must never pick up a text shadow left set by whatever was printed.
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  const { pale, tone, flecks } = strength(paper);
  const transform = new DOMMatrix()
    .translate((side * 197) % tile, (side * 331) % tile)
    .scale(tile / assets.tone.naturalWidth);

  for (const [image, mode, alpha] of [
    [pale ? assets.fine : assets.tone, "soft-light", tone],
    [assets.flecks, "multiply", flecks],
  ] as const) {
    const pattern = ctx.createPattern(image, "repeat")!;
    pattern.setTransform(transform);
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}
