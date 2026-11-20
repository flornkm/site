export const DAY = 86_400_000;
export const WEEK = 7 * DAY;

// Dates are calendar days, not instants: parse and format them in UTC so no timezone shifts a
// Monday onto a Sunday.
export const toTime = (isoDate: string) => Date.parse(`${isoDate}T00:00:00Z`);

const dayFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export const formatDay = (time: number) => dayFormat.format(time);
export const formatRange = (from: number, to: number) => `${formatDay(from)} – ${formatDay(to)}`;
export const daysBetween = (from: number, to: number) => Math.round((to - from) / DAY);
