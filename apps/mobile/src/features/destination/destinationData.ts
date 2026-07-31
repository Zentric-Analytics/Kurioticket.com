import type { DestinationDetail, DestinationSlug } from "./destinationModel";

const ENTRY_REMINDER = "Check current visa and entry requirements before booking.";
const COMMON_NOTES = [
  "Common departures: Lagos (LOS) and Abuja (ABV).",
  "Check passport validity and entry rules before you travel.",
  "Compare baggage allowances before choosing a provider.",
  ENTRY_REMINDER,
] as const;

export const ILLUSTRATIVE_FARE_DISCLAIMER = "Illustrative fares only. Search to view current provider prices.";

export const DESTINATIONS: readonly DestinationDetail[] = [
  {
    slug: "paris", name: "Paris", country: "France", sampleFare: "₦620,000",
    image: require("../../../assets/destinations/paris.jpg"), imageAsset: "assets/destinations/paris.jpg",
    description: "An unforgettable city of art, food and timeless streets.",
    whyVisit: "From iconic landmarks and world-class art to charming cafés and riverside walks, Paris is perfect for culture, romance and unforgettable memories.",
    tags: ["Culture", "Food", "Romance", "Shopping"], currency: "Euro (EUR)", airports: ["Paris Charles de Gaulle (CDG)", "Paris Orly (ORY)"],
    experiences: [{ title: "Iconic landmarks", subtitle: "Timeless city views" }, { title: "Art and museums", subtitle: "World-class culture" }, { title: "Neighbourhood cafés", subtitle: "Parisian everyday life" }],
    seasons: [{ range: "Apr – Jun", description: "Best weather", recommended: true }, { range: "Jul – Aug", description: "Warm and lively" }, { range: "Sep – Oct", description: "Pleasant and less crowded" }, { range: "Nov – Mar", description: "Cool and quiet" }],
    nigeriaNotes: COMMON_NOTES,
  },
  {
    slug: "bali", name: "Bali", country: "Indonesia", sampleFare: "₦980,000",
    image: require("../../../assets/destinations/bali.jpg"), imageAsset: "assets/destinations/bali.jpg",
    description: "A soulful island of beaches, temples and lush landscapes.",
    whyVisit: "Bali blends tropical shores, peaceful wellness escapes and rich traditions with adventures through forests, terraces and welcoming communities.",
    tags: ["Beaches", "Nature", "Wellness", "Adventure"], currency: "Indonesian rupiah (IDR)", airports: ["I Gusti Ngurah Rai International (DPS)"],
    experiences: [{ title: "Beaches and sunsets", subtitle: "Island coastlines" }, { title: "Temples and culture", subtitle: "Living traditions" }, { title: "Rice terraces", subtitle: "Lush landscapes" }],
    seasons: [{ range: "Apr – Jun", description: "Dry and quieter", recommended: true }, { range: "Jul – Aug", description: "Sunny peak season" }, { range: "Sep – Oct", description: "Warm and relaxed" }, { range: "Nov – Mar", description: "Tropical rainy season" }],
    nigeriaNotes: COMMON_NOTES,
  },
  {
    slug: "santorini", name: "Santorini", country: "Greece", sampleFare: "₦760,000",
    image: require("../../../assets/heroes/home-santorini.png"), imageAsset: "assets/heroes/home-santorini.png",
    description: "Dramatic island views, whitewashed villages and golden sunsets.",
    whyVisit: "Santorini pairs beautiful Aegean scenery with cliffside villages, local flavours and slow evenings made memorable by its celebrated sunsets.",
    tags: ["Islands", "Romance", "Sunsets", "Food"], currency: "Euro (EUR)", airports: ["Santorini International (JTR)"],
    experiences: [{ title: "Caldera views", subtitle: "Dramatic island scenery" }, { title: "Whitewashed villages", subtitle: "Cliffside wandering" }, { title: "Sunset sailing", subtitle: "Aegean evenings" }],
    seasons: [{ range: "Apr – May", description: "Mild and peaceful" }, { range: "Jun – Sep", description: "Warm island days", recommended: true }, { range: "Oct", description: "Soft autumn light" }, { range: "Nov – Mar", description: "Cool and very quiet" }],
    nigeriaNotes: COMMON_NOTES,
  },
  {
    slug: "new-york", name: "New York", country: "United States", sampleFare: "₦1,150,000",
    image: require("../../../assets/destinations/new-york.jpg"), imageAsset: "assets/destinations/new-york.jpg",
    description: "An electric city of neighbourhoods, culture and iconic skylines.",
    whyVisit: "New York rewards every kind of traveller with unforgettable city views, renowned culture, diverse food and neighbourhoods full of distinct character.",
    tags: ["City life", "Culture", "Food", "Shopping"], currency: "US dollar (USD)", airports: ["John F. Kennedy International (JFK)", "Newark Liberty International (EWR)", "LaGuardia (LGA)"],
    experiences: [{ title: "Skyline views", subtitle: "The city from above" }, { title: "Museums and culture", subtitle: "Creative landmarks" }, { title: "Neighbourhood food", subtitle: "Flavours from everywhere" }],
    seasons: [{ range: "Apr – Jun", description: "Comfortable spring", recommended: true }, { range: "Jul – Aug", description: "Hot and energetic" }, { range: "Sep – Nov", description: "Crisp autumn days" }, { range: "Dec – Mar", description: "Cold city season" }],
    nigeriaNotes: COMMON_NOTES,
  },
] as const;

export const DESTINATION_SLUGS = DESTINATIONS.map((item) => item.slug);
export function getDestination(slug: string | undefined): DestinationDetail | undefined {
  return DESTINATIONS.find((item) => item.slug === slug);
}
export function slugForDestination(name: string): DestinationSlug | undefined {
  return DESTINATIONS.find((item) => item.name === name)?.slug;
}
