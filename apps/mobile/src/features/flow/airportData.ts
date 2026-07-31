export const airports = [
  { code: "JFK", city: "New York", country: "USA" },
  { code: "LAX", city: "Los Angeles", country: "USA" },
  { code: "LHR", city: "London", country: "United Kingdom" },
  { code: "CDG", city: "Paris", country: "France" },
  { code: "DXB", city: "Dubai", country: "United Arab Emirates" },
  { code: "DPS", city: "Bali", country: "Indonesia" },
  { code: "JTR", city: "Santorini", country: "Greece" },
  { code: "NRT", city: "Tokyo", country: "Japan" },
  { code: "FCO", city: "Rome", country: "Italy" },
  { code: "BCN", city: "Barcelona", country: "Spain" },
  { code: "BKK", city: "Bangkok", country: "Thailand" },
  { code: "IST", city: "Cappadocia", country: "Turkey" },
] as const;

export type Airport = (typeof airports)[number];
