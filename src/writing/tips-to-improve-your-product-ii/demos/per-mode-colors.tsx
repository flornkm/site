import { cn } from "@/lib/utils";
import { IconMoon } from "central-icons/IconMoon";
import { IconSun } from "central-icons/IconSun";
import { useState } from "react";
import { DemoFrame, ModeSwitch } from "./demo-frame";

/* Three sticky notes, and a light and dark switch that turns the whole frame, independent of the
   page's theme. In light the notes are the pastels they were picked as. In dark, the same pastels
   glare like light boxes; with dark values, a little dimmer and more saturated in the same hues,
   they stay just as bright in colour but stop shining. It starts dark, where it breaks. */

type Mode = "same" | "per-mode";
type Theme = "light" | "dark";
const MODES: { value: Mode; label: string }[] = [
  { value: "same", label: "Same colors" },
  { value: "per-mode", label: "Per mode" },
];

const NOTES = [
  {
    text: "call dad back",
    rotate: -4,
    y: 4,
    colors: { same: "#fff1a6", "per-mode": "oklch(0.84 0.13 95)" },
  },
  {
    text: "oat milk, limes",
    rotate: 3,
    y: -6,
    colors: { same: "#ffd3e2", "per-mode": "oklch(0.78 0.12 0)" },
  },
  {
    text: "ship the tips post",
    rotate: -1.5,
    y: 2,
    colors: { same: "#cfe8ff", "per-mode": "oklch(0.78 0.11 240)" },
  },
] as const;

// Paper grain: faint dark speckle from fractal noise, tiled.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

// The glued top sits a touch darker; below it the sheet bows away from the board and catches light,
// and the curled bottom edge turns slightly into shadow.
const CURL =
  "linear-gradient(to bottom, oklch(0 0 0 / 0.035), transparent 22% 52%, oklch(1 0 0 / 0.12) 88%, oklch(0 0 0 / 0.07))";

// Blurred shadows under the two lifted bottom corners; the glued top casts almost none.
const CORNER =
  "absolute bottom-[3px] h-[24%] w-[44%] bg-[var(--corner)] blur-[5px] transition-colors duration-200";

// The whole frame turns, so the notes sit straight on the light or dark page with nothing around
// them. Explicit colours rather than tokens: it has to go light or dark whatever the page is. The
// controls inside follow by redefining the theme tokens they read (colors.css, light and dark
// values) for this subtree, and color-scheme flips the hairline in their shadow rings.
const FRAME: Record<Theme, string> = {
  light: cn(
    "bg-white [--corner:oklch(0_0_0/0.28)] [color-scheme:light]",
    "[--surface:#ffffff] [--surface-tertiary:#f5f5f5] [--text-primary:#171717] [--text-secondary:#525252] [--text-tertiary:#737373] [--text-quaternary:#a3a3a3]",
  ),
  dark: cn(
    "bg-[oklch(0.2_0_0)] [--corner:oklch(0_0_0/0.7)] [color-scheme:dark]",
    "[--surface:#3a3a3a] [--surface-tertiary:#2b2b2b] [--text-primary:#ffffff] [--text-secondary:#bdbdbd] [--text-tertiary:#969696] [--text-quaternary:#7a7a7a]",
  ),
};

const ICON =
  "col-start-1 row-start-1 size-4 transition-[opacity,scale,filter] duration-200 ease-out";

export function PerModeColors() {
  const [mode, setMode] = useState<Mode>("same");
  const [theme, setTheme] = useState<Theme>("dark");
  const dark = theme === "dark";
  // Light values are the starting point, so light shows them in either mode.
  const palette: Mode = dark ? mode : "same";

  return (
    <DemoFrame className={cn("transition-colors duration-300 ease-out", FRAME[theme])}>
      <div className="flex w-full flex-1 items-center justify-center gap-4 pb-10">
        {NOTES.map((note) => (
          <div
            key={note.text}
            style={{ rotate: `${note.rotate}deg`, translate: `0 ${note.y}px` }}
            className="relative size-[100px] shrink-0"
          >
            <span
              aria-hidden
              className={`${CORNER} left-[5px] origin-bottom-left rotate-[-5deg]`}
            />
            <span
              aria-hidden
              className={`${CORNER} right-[5px] origin-bottom-right rotate-[5deg]`}
            />
            <p
              style={{
                backgroundColor: note.colors[palette],
                backgroundImage: `${CURL}, ${GRAIN}`,
              }}
              className="relative size-full rounded-[1.5px] px-3 pt-3.5 font-['Cedarville_Cursive',cursive] text-[16px] leading-[19px] text-[oklch(0.3_0.05_262)] shadow-[0_1px_1px_oklch(0_0_0/0.3)] transition-[background-color] duration-200 ease-out"
            >
              {note.text}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center gap-2">
        <ModeSwitch label="Note colors" modes={MODES} value={mode} onChange={setMode} />
        <button
          type="button"
          aria-label={dark ? "Switch to light" : "Switch to dark"}
          onClick={() => setTheme(dark ? "light" : "dark")}
          className="grid size-[38px] shrink-0 cursor-pointer place-items-center rounded-full bg-surface-tertiary text-secondary outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-default"
        >
          <IconMoon className={cn(ICON, !dark && "scale-50 opacity-0 blur-[2px]")} />
          <IconSun className={cn(ICON, dark && "scale-50 opacity-0 blur-[2px]")} />
        </button>
      </div>
    </DemoFrame>
  );
}
