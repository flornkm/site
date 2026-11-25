import { useSyncExternalStore } from "react";

// One portrait card, A6 proportions, as large as fits with room under it for the password
// field. A phone on its side has no room under it, so the field goes beside the card.
export type CardSize = { width: number; height: number; aside: boolean };

const RATIO = Math.SQRT2;

export function cardSize(viewportWidth: number, viewportHeight: number): CardSize {
  const aside = viewportWidth > viewportHeight && viewportHeight < 560;
  const width = Math.floor(
    aside
      ? Math.min(380, (viewportHeight - 48) / RATIO)
      : Math.min(380, viewportWidth - 56, (viewportHeight - 250) / RATIO),
  );
  return { width, height: Math.round(width * RATIO), aside };
}

// Height only ever grows for a given width, so a phone keyboard sliding up over the
// password field doesn't shrink the card out from under the input.
let lastWidth = 0;
let tallest = 0;

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function getSnapshot(): string {
  const width = window.innerWidth;
  if (width !== lastWidth) {
    lastWidth = width;
    tallest = window.innerHeight;
  } else {
    tallest = Math.max(tallest, window.innerHeight);
  }
  return `${width}x${tallest}`;
}

// The card only exists client-side (its content is encrypted), so the server renders none.
export function useCardSize(): CardSize | null {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "");
  if (!snapshot) return null;
  const [width, height] = snapshot.split("x").map(Number);
  return cardSize(width, height);
}
