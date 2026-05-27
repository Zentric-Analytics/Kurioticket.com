export type FlightValuePoint = {
  title: string;
  description: string;
};

export type FlightRoutePreview = {
  origin: string;
  destination: string;
  tag: string;
  blurb: string;
};

export type FlightFaq = {
  question: string;
  answer: string;
};

export const flightValuePoints: FlightValuePoint[] = [
  {
    title: "Smarter fare discovery",
    description:
      "Compare trusted flight options quickly with filters built for timing, comfort, and total trip value.",
  },
  {
    title: "Clear total-trip context",
    description:
      "See itinerary details and flight trade-offs in one place so you can book with confidence.",
  },
  {
    title: "Designed for global travelers",
    description:
      "Curioticket supports region-aware exploration and a streamlined flow from inspiration to checkout.",
  },
];

export const curatedRoutes: FlightRoutePreview[] = [
  {
    origin: "New York",
    destination: "Barcelona",
    tag: "Summer city break",
    blurb: "Great for architecture, beach afternoons, and late dining windows.",
  },
  {
    origin: "San Francisco",
    destination: "Tokyo",
    tag: "Culture + food",
    blurb: "Ideal for travelers balancing modern neighborhoods with classic districts.",
  },
  {
    origin: "Chicago",
    destination: "Lisbon",
    tag: "Atlantic escape",
    blurb: "Popular for long weekends with warm weather, walkable hills, and ocean views.",
  },
  {
    origin: "Miami",
    destination: "Buenos Aires",
    tag: "Seasonal contrast",
    blurb: "A strong option when you want a different season and vibrant nightlife.",
  },
];

export const flightFaqs: FlightFaq[] = [
  {
    question: "When should I search for flights?",
    answer:
      "Start monitoring early and compare multiple departure windows. Mid-week departures and flexible dates can often unlock better value.",
  },
  {
    question: "Can I compare more than price?",
    answer:
      "Yes. Use Curioticket results to weigh layovers, travel time, baggage considerations, and schedule fit — not just headline fare.",
  },
  {
    question: "Are shown routes live prices?",
    answer:
      "No. The landing page highlights curated route ideas only. Live fare details are shown in the flight results workspace.",
  },
];
