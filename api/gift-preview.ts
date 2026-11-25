import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./utils/_firebase";

// A gift's link preview, rendered when it was sealed (scripts/seal-gifts.ts). It shows only
// the card's front, which the gift page shows anyone with the link anyway. Never indexed.
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

function param(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, noimageindex");
  const collection = param(req.query.c);
  const id = param(req.query.id);
  if (!SLUG.test(collection) || !SLUG.test(id)) return res.status(404).end();

  const snapshot = await db.ref(`giftPreviews/${collection}/${id}`).get();
  const image: unknown = snapshot.val();
  if (typeof image !== "string") return res.status(404).end();

  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
  return res.status(200).send(Buffer.from(image, "base64"));
}
