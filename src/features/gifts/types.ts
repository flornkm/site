// The decrypted shape of a gift. Validated by scripts/seal-gifts.ts before sealing.
// One card in one stock: `cover` prints the front, `back` and `gift` the reverse.
export type Gift = {
  recipient: string;
  cover: {
    paper: string;
    ink: string;
    title?: string;
  };
  back: {
    headline: string;
    message: string[];
    signature: string;
  };
  // The line under the card once it's open; defaults to DEFAULT_HINT.
  hint?: string;
  gift?: {
    label: string;
    detail: string;
    code?: string;
  };
};

export const DEFAULT_HINT = "Drag or tap to turn it over";
