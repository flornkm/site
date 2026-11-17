// The swatch every legend and tooltip row uses: a small rounded square in the series colour.
export function SeriesKey({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0"
      style={{ width: size, height: size, borderRadius: size * 0.3, background: color }}
    />
  );
}
