import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { CHART_THEME } from "./theme";

export function ChartRoot({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <div style={CHART_THEME} className={cx("w-full font-pretendard select-none", className)}>
        {children}
      </div>
    </MotionConfig>
  );
}
