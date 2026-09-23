import type { FaqItem } from "./content";

/** Shared by the full FAQ and the compact energy guide; generic scenarios, not product guarantees. */
export const HYBRID_FAQS: FaqItem[] = [
  {
    id: "hybrid-day",
    category: "hybrid",
    question: "How does solar reduce my daytime electricity bill?",
    answer:
      "Solar can power your home directly and store surplus energy in the battery. This reduces grid purchases when generation matches your needs; savings depend on usage, system size and your local tariff.",
    keywords: ["daytime", "solar", "charging", "bill"],
    link: { href: "/how-it-works#scene-day", label: "See daytime supply" },
  },
  {
    id: "hybrid-night",
    category: "hybrid",
    question: "Can I use solar energy after sunset?",
    answer:
      "Yes, if it was stored in the battery during the day. Stored solar energy can reduce evening grid purchases until the battery reaches its reserve or its power limit.",
    keywords: ["night", "sunset", "battery", "reserve"],
    link: { href: "/how-it-works#scene-night", label: "See evening supply" },
  },
  {
    id: "hybrid-outage",
    category: "hybrid",
    question: "What happens during a power cut?",
    answer:
      "For Caribbean homes planning around outages, a correctly configured backup system can isolate from the grid and supply selected essentials using available solar and battery energy. Runtime depends on charge and loads; an empty battery and insufficient sunlight cannot sustain backup. Supply fluctuations and sensitive appliances should be discussed during the site assessment.",
    keywords: [
      "Caribbean",
      "Antigua",
      "Dominica",
      "outage",
      "power cut",
      "voltage",
      "backup",
      "fluctuation",
    ],
    link: { href: "/how-it-works#scene-outage", label: "See outage backup" },
  },
  {
    id: "hybrid-grid",
    category: "hybrid",
    question: "What if the battery reaches its reserve?",
    answer:
      "With the grid available, it can supply your home when stored energy is reserved and solar is unavailable. Reaching the reserve does not necessarily mean the battery is empty. Grid electricity still incurs normal charges.",
    keywords: ["grid", "reserve", "empty", "low battery"],
    link: { href: "/how-it-works#scene-grid", label: "See grid supply" },
  },
  {
    id: "hybrid-solar-grid",
    category: "hybrid",
    question: "Can solar and the grid power my home together?",
    answer:
      "In a compatible hybrid system, solar can supply part of your demand and the grid can cover the shortfall. This still reduces grid purchases. Our example keeps the battery in reserve; actual sharing depends on settings and available energy.",
    keywords: ["cloudy", "partial", "hybrid", "solar grid", "savings"],
    link: { href: "/how-it-works#scene-solar-grid", label: "See solar + grid" },
  },
  {
    id: "hybrid-solar-battery",
    category: "hybrid",
    question: "Can the battery help when solar is not enough?",
    answer:
      "Yes, while usable charge and power are available. Solar and the battery can supply your home together, reducing grid demand. The grid may also contribute if supported by the configuration; this does not remove the system’s power limits.",
    keywords: ["cloudy", "demand", "solar battery", "hybrid", "power limits"],
    link: {
      href: "/how-it-works#scene-solar-battery",
      label: "See solar + battery",
    },
  },
];

export const HYBRID_FEATURED_FAQ_IDS = [
  "hybrid-night",
  "hybrid-outage",
  "hybrid-solar-grid",
  "hybrid-solar-battery",
];
