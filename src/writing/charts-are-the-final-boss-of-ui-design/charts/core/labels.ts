// Nudges labels apart vertically so none sit closer than `gap`, keeping their order.
export function spread<T extends { y: number }>(items: readonly T[], gap = 13): T[] {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const placed: T[] = [];
  for (const item of sorted) {
    const previous = placed[placed.length - 1];
    placed.push(previous && item.y - previous.y < gap ? { ...item, y: previous.y + gap } : item);
  }
  return placed;
}

// How much a mark recedes when another series is picked out.
export const dimmed = (highlighted: string | null, id: string) =>
  highlighted !== null && highlighted !== id ? 0.15 : 1;
