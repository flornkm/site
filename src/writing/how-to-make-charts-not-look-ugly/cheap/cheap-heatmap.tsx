import { useId } from "react";
import { CheapFrame, INK } from "./kit";

const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const clamp = (n: number) => Math.max(0, Math.min(1, n));

// The jet rainbow: blue, cyan, green, yellow, red.
function jet(t: number) {
  const channel = (offset: number) => Math.round(clamp(1.5 - Math.abs(4 * t - offset)) * 255);
  return `rgb(${channel(3)},${channel(2)},${channel(1)})`;
}

const STOPS = Array.from({ length: 9 }, (_, i) => i / 8);

// Rainbow colours that make the dull hours look as loud as the busy ones, a raw count printed in
// every cell whether it fits or not, and 24 rotated hour labels.
export function CheapHeatmap({
  values,
  height,
  label,
}: {
  values: readonly (readonly number[])[];
  height: number;
  label: string;
}) {
  const gradientId = useId();
  const max = Math.max(...values.flat());

  return (
    <CheapFrame height={height} label={label}>
      {(width) => {
        const left = 66;
        const right = width - 48;
        const top = 8;
        const bottom = height - 40;
        const cellW = (right - left) / 24;
        const cellH = (bottom - top) / values.length;

        return (
          <>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
                {STOPS.map((t) => (
                  <stop key={t} offset={t} stopColor={jet(t)} />
                ))}
              </linearGradient>
            </defs>
            {values.map((hours, day) => (
              <g key={day}>
                <text
                  x={left - 6}
                  y={top + cellH * (day + 0.5)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill={INK}
                >
                  {FULL_DAYS[day]}
                </text>
                {hours.map((value, hour) => (
                  <g key={hour}>
                    <rect
                      x={left + cellW * hour}
                      y={top + cellH * day}
                      width={cellW}
                      height={cellH}
                      fill={jet(value / max)}
                      stroke="#fff"
                    />
                    <text
                      x={left + cellW * (hour + 0.5)}
                      y={top + cellH * (day + 0.5)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={9}
                      fill="#000"
                    >
                      {value}
                    </text>
                  </g>
                ))}
              </g>
            ))}
            {Array.from({ length: 24 }, (_, hour) => (
              <text
                key={hour}
                transform={`translate(${left + cellW * (hour + 0.5)},${bottom + 6}) rotate(-90)`}
                textAnchor="end"
                dominantBaseline="middle"
                fill={INK}
              >
                {`${hour}:00`}
              </text>
            ))}
            <rect
              x={right + 10}
              y={top}
              width={12}
              height={bottom - top}
              fill={`url(#${CSS.escape(gradientId)})`}
            />
            <text x={right + 26} y={top + 4} dominantBaseline="middle" fill={INK} fontSize={10}>
              {max}
            </text>
            <text x={right + 26} y={bottom - 4} dominantBaseline="middle" fill={INK} fontSize={10}>
              0
            </text>
          </>
        );
      }}
    </CheapFrame>
  );
}
