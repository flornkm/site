import { cx } from "../charts/core/cx";
import type { CSSProperties, ReactNode } from "react";

// Wider than the text column and centred on it, so a dashboard of charts has room to sit side by
// side. Six columns, so a row can split into thirds or halves.
export function Bento({ children }: { children: ReactNode }) {
  return (
    <div
      className="not-prose my-10 grid grid-cols-1 gap-3 lg:grid-cols-6"
      style={{
        width: "min(1040px, calc(100vw - 48px))",
        marginLeft: "50%",
        transform: "translateX(-50%)",
      }}
    >
      {children}
    </div>
  );
}

const SPAN = {
  full: "lg:col-span-6",
  wide: "lg:col-span-4",
  half: "lg:col-span-3",
  narrow: "lg:col-span-2",
} as const;

export function ChartCard({
  title,
  value,
  span = "half",
  children,
}: {
  title: string;
  value?: string;
  span?: keyof typeof SPAN;
  children: ReactNode;
}) {
  return (
    <section
      style={{ "--chart-backdrop": "var(--surface)" } as CSSProperties}
      className={cx(
        "flex min-w-0 flex-col rounded-2xl bg-surface p-5 font-pretendard smooth-shadow-ring-xs",
        SPAN[span],
      )}
    >
      <header className="mb-4">
        <h3 className="text-lg leading-6 font-medium tracking-tight text-tertiary">{title}</h3>
        {value && (
          <p className="text-lg leading-6 font-medium tracking-tight text-primary tabular-nums">
            {value}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}
