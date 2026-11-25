// Gifts are sealed with AES-GCM under a key stretched from the gift's password, so the
// site (and its public repo) only ever holds ciphertext. A wrong password fails GCM's
// auth tag, which is also how the gate tells a typo from a valid unlock.
export type SealedGift = {
  v: 1;
  iterations: number;
  salt: string;
  iv: string;
  data: string;
};

// What the card shows before the password: printed on its front, so not secret.
export type GiftCover = { paper: string; ink: string; title: string };
export type StoredGift = SealedGift & { cover: GiftCover };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Passwords are read off a handwritten note, so case, spaces and dashes don't count.
export function normalizePassword(password: string): string {
  return password
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-_.]+/g, "");
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
  usage: KeyUsage,
) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(normalizePassword(password)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

export async function seal(
  payload: unknown,
  password: string,
  iterations = 400_000,
): Promise<SealedGift> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iterations, "encrypt");
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(payload)),
  );
  return {
    v: 1,
    iterations,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(data)),
  };
}

export async function unseal<T>(sealed: SealedGift, password: string): Promise<T | null> {
  try {
    const key = await deriveKey(password, fromBase64(sealed.salt), sealed.iterations, "decrypt");
    const data = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(sealed.iv) },
      key,
      fromBase64(sealed.data),
    );
    return JSON.parse(decoder.decode(data)) as T;
  } catch {
    return null;
  }
}
