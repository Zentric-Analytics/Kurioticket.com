export const airports = [
  { code: "JFK", city: "New York", country: "USA" },
  { code: "LAX", city: "Los Angeles", country: "USA" },
  { code: "LHR", city: "London", country: "United Kingdom" },
  { code: "CDG", city: "Paris", country: "France" },
] as const;

export type Airport = (typeof airports)[number];
export type TripType = "round-trip" | "one-way" | "multi-city";
export type Cabin = "Economy" | "Premium Economy" | "Business" | "First";

export const destinationImages = {
  "New York": require("../../../assets/destinations/new-york.jpg"),
  London: require("../../../assets/destinations/london.jpg"),
  Paris: require("../../../assets/destinations/paris.jpg"),
  Bali: require("../../../assets/destinations/bali.jpg"),
} as const;

export const seededTrips = [
  { id: "new-york-los-angeles", route: "New York → Los Angeles", dates: "May 20 – May 27", status: "Confirmed", image: destinationImages["New York"] },
  { id: "rome-paris", route: "Rome → Paris", dates: "Apr 10 – Apr 16, 2025", status: "Completed", image: destinationImages.Paris },
  { id: "tokyo-osaka", route: "Tokyo → Osaka", dates: "Mar 5 – Mar 12, 2025", status: "Completed", image: destinationImages.Bali },
  { id: "milan-london", route: "Milan → London", dates: "Feb 14 – Feb 21, 2025", status: "Completed", image: destinationImages.London },
] as const;
