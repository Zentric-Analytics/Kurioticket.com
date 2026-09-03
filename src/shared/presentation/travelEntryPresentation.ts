export const travelEntryPresentation = {
  flights: {
    product: "Flights",
    heroTitle: "Find your next affordable flight with ease.",
    heroSubtitle:
      "Search routes, compare dates, and explore flight options for your next journey.",
    tripModes: ["Round-trip", "One-way", "Multi-city"],
    fields: ["Origin", "Destination", "Travel dates", "Travelers & Cabin Class"],
    submit: "Search flights",
  },
  hotels: {
    product: "Hotels",
    heroTitle: "Find the stay that starts the trip right.",
    fields: ["Destination", "Travel dates", "Guests"],
    submit: "Search hotels",
  },
  cars: {
    product: "Cars",
    heroTitle: "Find the perfect car for your next trip",
    fields: [
      "Pick-up location",
      "Drop-off location",
      "Rental dates",
      "Pick-up / Return time",
      "Driver age",
    ],
    submit: "Search cars",
    separateDropoff: "Return to a different location",
  },
} as const;

export type SharedHotelDestinationCard = {
  canonicalDestinationId: string;
  title: string;
  subtitle: string;
  destinationQuery: string;
  image: string;
  imageAlt: string;
  linkLabel: string;
};

export const primaryHotelDestinationCards: readonly SharedHotelDestinationCard[] = [
  { canonicalDestinationId: "jp-tokyo", title: "Japan", subtitle: "Tokyo stays", destinationQuery: "Tokyo", image: "https://images.pexels.com/photos/31344755/pexels-photo-31344755.jpeg?auto=compress&cs=tinysrgb&w=1200", imageAlt: "Tokyo skyline with dense high-rise buildings in daylight", linkLabel: "Search hotels in Tokyo, Japan" },
  { canonicalDestinationId: "gb-london", title: "United Kingdom", subtitle: "London stays", destinationQuery: "London", image: "https://images.pexels.com/photos/33843218/pexels-photo-33843218.jpeg?auto=compress&cs=tinysrgb&w=1200", imageAlt: "Tower Bridge and the River Thames in London under a blue sky", linkLabel: "Search hotels in London, United Kingdom" },
  { canonicalDestinationId: "fr-paris", title: "France", subtitle: "Paris stays", destinationQuery: "Paris", image: "https://images.pexels.com/photos/2082103/pexels-photo-2082103.jpeg?auto=compress&cs=tinysrgb&w=1200", imageAlt: "Eiffel Tower and the Seine River in Paris at golden hour", linkLabel: "Search hotels in Paris, France" },
  { canonicalDestinationId: "us-new-york", title: "United States", subtitle: "New York stays", destinationQuery: "New York", image: "https://images.pexels.com/photos/11182439/pexels-photo-11182439.jpeg?auto=compress&cs=tinysrgb&w=1200", imageAlt: "New York City skyline with One World Trade Center and waterfront", linkLabel: "Search hotels in New York, United States" },
] as const;
