export type Project = {
  name: string;
  date: string;
  url?: string;
  /** One-sentence summary of the project, shown as the link title on home and in the
   * markdown variant of the page. */
  description?: string;
};

export const PROJECTS: Project[] = [
  {
    name: "Cognition",
    description: "Design work for Cognition, the company behind Devin, the AI software engineer.",
    date: "2026",
    url: "https://cognition.ai",
  },
  {
    name: "Legora",
    description: "Design work for Legora, a collaborative AI platform for lawyers.",
    date: "2026",
    url: "https://legora.com",
  },
  {
    name: "Rogo",
    description: "Design work for Rogo, an AI platform for financial research and analysis.",
    date: "2026",
    url: "https://rogo.com",
  },
  {
    name: "Kalshi",
    description: "Design work for Kalshi, a regulated prediction-market exchange.",
    date: "2025",
    url: "https://kalshi.com",
  },
  {
    name: "Superpower",
    description:
      "Interface work for Superpower, a preventative health platform — health data categories, protocols, and mobile app surfaces.",
    date: "2025 – 2026",
    url: "https://superpower.com",
  },
  {
    name: "Flow",
    description:
      "Design and engineering for Flow Engineering’s web presence, from the company pages to an animated 404.",
    date: "2026",
    url: "https://flowengineering.com",
  },
  {
    name: "Delphi",
    description: "Design work for Delphi, a platform for interactive digital minds.",
    date: "2026",
    url: "https://delphi.ai",
  },
  {
    name: "Morphic",
    description: "Product design collaboration with Morphic.",
    date: "2024",
    url: "https://morphic.com",
  },
  {
    name: "Dash0",
    description: "Design work for Dash0, an OpenTelemetry-native observability platform.",
    date: "2024",
    url: "https://dash0.com",
  },
  {
    name: "Opral",
    description:
      "Design engineering for Opral, the company behind the inlang globalization ecosystem.",
    date: "2023 – 2024",
    url: "https://opral.com",
  },
];
