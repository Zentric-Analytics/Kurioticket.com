export type Airport = {
  code: string;
  city: string;
  country: string;
  countryCode: string;
  airport: string;
  priority: number;
};

/**
 * Emergency mobile-safe catalogue.
 *
 * The previous implementation imported the website's repository-level airport
 * module into the native runtime. Although Metro could bundle it, that also made
 * the app execute website-oriented country helpers during startup. Keep this
 * small self-contained catalogue temporarily while the full catalogue is moved
 * into a genuinely platform-neutral shared package.
 */
export const airports: readonly Airport[] = [
  { code: "JFK", city: "New York", country: "United States", countryCode: "US", airport: "John F. Kennedy International Airport", priority: 100 },
  { code: "LAX", city: "Los Angeles", country: "United States", countryCode: "US", airport: "Los Angeles International Airport", priority: 99 },
  { code: "LHR", city: "London", country: "United Kingdom", countryCode: "GB", airport: "Heathrow Airport", priority: 98 },
  { code: "CDG", city: "Paris", country: "France", countryCode: "FR", airport: "Charles de Gaulle Airport", priority: 97 },
  { code: "DXB", city: "Dubai", country: "United Arab Emirates", countryCode: "AE", airport: "Dubai International Airport", priority: 96 },
  { code: "DPS", city: "Denpasar", country: "Indonesia", countryCode: "ID", airport: "I Gusti Ngurah Rai International Airport", priority: 95 },
  { code: "JTR", city: "Santorini", country: "Greece", countryCode: "GR", airport: "Santorini Airport", priority: 94 },
  { code: "NRT", city: "Tokyo", country: "Japan", countryCode: "JP", airport: "Narita International Airport", priority: 93 },
  { code: "FCO", city: "Rome", country: "Italy", countryCode: "IT", airport: "Leonardo da Vinci–Fiumicino Airport", priority: 92 },
  { code: "BCN", city: "Barcelona", country: "Spain", countryCode: "ES", airport: "Josep Tarradellas Barcelona–El Prat Airport", priority: 91 },
  { code: "BKK", city: "Bangkok", country: "Thailand", countryCode: "TH", airport: "Suvarnabhumi Airport", priority: 90 },
  { code: "IST", city: "Istanbul", country: "Türkiye", countryCode: "TR", airport: "Istanbul Airport", priority: 89 },
];
