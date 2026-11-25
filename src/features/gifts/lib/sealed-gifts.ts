import type { StoredGift } from "@/features/gifts/lib/seal";
import { createServerFn } from "@tanstack/react-start";
import { db } from "../../../../api/utils/_firebase";

// Sealed gifts live in Firebase at gifts/<collection>/<id>, uploaded by
// scripts/seal-gifts.ts. Apart from the cover, ciphertext only: neither the database nor
// this server ever holds the readable inside. New gifts need no deploy.
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

export const getSealedGift = createServerFn({ method: "GET" })
  .inputValidator((input: { collection: string; id: string }) => input)
  .handler(async ({ data }): Promise<StoredGift | null> => {
    // Slugs only: Firebase paths treat "/", ".", "#", "$", "[" and "]" specially.
    if (!SLUG.test(data.collection) || !SLUG.test(data.id)) return null;
    const snapshot = await db.ref(`gifts/${data.collection}/${data.id}`).once("value");
    return (snapshot.val() as StoredGift | null) ?? null;
  });
