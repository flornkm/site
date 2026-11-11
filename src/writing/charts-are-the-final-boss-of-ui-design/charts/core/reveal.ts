// The shared entrance: one smooth ease-out, started when a chart is mostly on screen, and only
// once. Charts stagger off these instead of each inventing its own spring.
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const IN_VIEW = { once: true, amount: 0.5 } as const;
export const reveal = (delay = 0, duration = 0.5) => ({
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: IN_VIEW,
  transition: { duration, delay, ease: EASE_OUT },
});
