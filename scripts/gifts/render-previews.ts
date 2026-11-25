// Renders each gift's link preview (src/features/gifts/print/preview.ts) in headless
// Chrome, so it's printed by exactly the code and fonts the card itself uses. The page is
// served from a stand-in for the real origin: the font CDN only answers the site's own.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import type { GiftCover } from "../../src/features/gifts/lib/seal";

const ROOT = path.resolve(import.meta.dirname!, "../..");
const ORIGIN = "https://floriankiem.com";

const PAGE = `<!doctype html>
<style>
  @font-face {
    font-family: "Wagram";
    font-weight: 400;
    font-style: italic;
    src: url(https://cdn.floriankiem.com/fonts/wagram/v1/Wagram-Italic.woff2) format("woff2");
  }
</style>
<script type="module" src="/preview.js"></script>`;

export async function renderPreviews(covers: GiftCover[]): Promise<Buffer[]> {
  if (covers.length === 0) return [];
  const build = await Bun.build({
    entrypoints: [path.join(ROOT, "src/features/gifts/print/preview.ts")],
    target: "browser",
    minify: true,
  });
  if (!build.success) throw new AggregateError(build.logs, "preview bundle failed");
  const script = await build.outputs[0].text();

  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage();
    await page.route(`${ORIGIN}/**`, async (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname === "/preview.js") {
        return route.fulfill({ contentType: "text/javascript", body: script });
      }
      if (pathname.startsWith("/textures/gifts/")) {
        return route.fulfill({ path: path.join(ROOT, "public", pathname) });
      }
      return route.fulfill({ contentType: "text/html", body: PAGE });
    });
    await page.goto(`${ORIGIN}/`);
    await page.waitForFunction(() => typeof window.drawPreview === "function");

    const images: Buffer[] = [];
    for (const cover of covers) {
      const dataUrl = await page.evaluate((c) => window.drawPreview(c), cover);
      images.push(Buffer.from(dataUrl.split(",")[1], "base64"));
    }
    return images;
  } finally {
    await browser.close();
  }
}

// Writes previews next to the plaintext sources (gitignored), to look at before sending.
export function savePreview(collection: string, id: string, image: Buffer) {
  const file = path.join(ROOT, "gifts", collection, `${id}.preview.jpg`);
  fs.writeFileSync(file, image);
  return path.relative(ROOT, file);
}
