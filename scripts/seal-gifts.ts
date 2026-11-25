// Seals every plaintext gift in /gifts/<collection>/<id>.json (gitignored) and uploads
// the ciphertext, plus the cover's colours and title, to Firebase at
// gifts/<collection>/<id>, where the gift route reads it. The link preview is drawn on
// request from that front (api/gift-preview.ts); the same renderer saves a copy beside
// each source as <id>.preview.jpg, to look at before sending.
// Each collection is replaced as a whole, so deleting a source file takes its gift down.
// A gift without a password gets a generated one written back into its source file.
//
// Run: bun scripts/seal-gifts.ts (Bun loads the Firebase credentials from .env)
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { db } from "../api/utils/_firebase";
import { seal, type StoredGift } from "../src/features/gifts/lib/seal";
import { renderGiftPreview } from "../api/utils/_gift-preview";

const ROOT = path.resolve(import.meta.dirname!, "..");
const SOURCE = path.join(ROOT, "gifts");
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "expected a #rrggbb colour");
const giftSchema = z
  .object({
    password: z.string().min(8).optional(),
    recipient: z.string().min(1),
    cover: z.object({
      paper: hex,
      ink: hex,
      title: z.string().optional(),
    }),
    back: z.object({
      headline: z.string().min(1),
      message: z.array(z.string().min(1)).min(1),
      signature: z.string().min(1),
    }),
    hint: z.string().min(1).max(80).optional(),
    gift: z
      .object({ label: z.string().min(1), detail: z.string().min(1), code: z.string().optional() })
      .optional(),
  })
  .strict();

// No 0/o/1/l/i: the password gets copied by hand off a note. 12 chars ≈ 59 bits.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
function generatePassword(): string {
  const chars = [...crypto.getRandomValues(new Uint8Array(12))].map(
    (byte) => ALPHABET[byte % ALPHABET.length],
  );
  return [0, 4, 8].map((start) => chars.slice(start, start + 4).join("")).join("-");
}

if (!fs.existsSync(SOURCE)) {
  console.log("No /gifts directory, nothing to seal.");
  process.exit(0);
}

let count = 0;
for (const collection of fs.readdirSync(SOURCE, { withFileTypes: true })) {
  if (!collection.isDirectory() || !SLUG.test(collection.name)) continue;

  const sealedGifts: Record<string, StoredGift> = {};

  for (const file of fs.readdirSync(path.join(SOURCE, collection.name))) {
    const id = file.replace(/\.json$/, "");
    if (!file.endsWith(".json") || !SLUG.test(id)) continue;

    const sourcePath = path.join(SOURCE, collection.name, file);
    const raw = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
    const parsed = giftSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(`${collection.name}/${file}:`, parsed.error.issues);
      process.exit(1);
    }

    let { password, ...gift } = parsed.data;
    if (!password) {
      password = generatePassword();
      fs.writeFileSync(sourcePath, `${JSON.stringify({ password, ...raw }, null, 2)}\n`);
      console.log(
        `${collection.name}/${id}: generated a password (see ${path.relative(ROOT, sourcePath)})`,
      );
    }

    const { paper, ink, title } = gift.cover;
    sealedGifts[id] = {
      ...(await seal(gift, password)),
      cover: { paper, ink, title: title ?? `For ${gift.recipient}` },
    };
    console.log(`sealed ${collection.name}/${id}`);
    count++;
  }

  await db.ref(`gifts/${collection.name}`).set(sealedGifts);

  for (const [id, { cover }] of Object.entries(sealedGifts)) {
    const image = await renderGiftPreview(cover, (name) =>
      fs.promises.readFile(path.join(ROOT, "public/textures/gifts", `paper-${name}.webp`)),
    );
    const file = path.join(SOURCE, collection.name, `${id}.preview.jpg`);
    fs.writeFileSync(file, image);
    console.log(`preview ${path.relative(ROOT, file)}`);
  }
}
console.log(`${count} gift(s) sealed and uploaded.`);
// The Admin SDK holds its connection open; nothing else is pending.
process.exit(0);
