import fs from "node:fs/promises";
import path from "node:path";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { previewVersion } from "../src/features/gifts/lib/preview-version";
import { renderGiftPreview, type PreviewCover } from "./utils/_gift-preview";
import { db } from "./utils/_firebase";

// A gift's link preview, drawn on request from its front (paper, ink, title), which the
// gift page shows anyone with the link anyway. Nothing of the sealed message is read.
// Never indexed. The textures ship with this function (vercel.json includeFiles).
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const TEXTURES = path.join(process.cwd(), "public/textures/gifts");

function param(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, noimageindex");
  const collection = param(req.query.c);
  const id = param(req.query.id);
  if (!SLUG.test(collection) || !SLUG.test(id)) return res.status(404).end();

  const cover: PreviewCover | null = (await db.ref(`gifts/${collection}/${id}/cover`).get()).val();
  if (!cover) return res.status(404).end();

  try {
    const image = await renderGiftPreview(cover, (name) =>
      fs.readFile(path.join(TEXTURES, `paper-${name}.webp`)),
    );
    // Under its current fingerprint the image never changes; any other URL may be stale.
    const current = param(req.query.v) === previewVersion(cover);
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader(
      "Cache-Control",
      current ? "public, max-age=31536000, immutable" : "public, max-age=300, s-maxage=3600",
    );
    return res.status(200).send(image);
  } catch (error) {
    console.error(error);
    return res.status(500).end();
  }
}
