import { useCallback, useState } from "react";

// Charts draw in real pixels so text and strokes never scale with the container. The width is 0
// until the element is measured, which is also what the server renders.
export function useWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(0);
  const ref = useCallback((node: T | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}
