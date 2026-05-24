export type AirportOption = {
  code: string;
  city: string;
  airport: string;
  country?: string;
  lat?: number;
  lon?: number;
};

export const airports: AirportOption[] = [
  { city: "Lagos", airport: "Murtala Muhammed International Airport", code: "LOS", country: "Nigeria", lat: 6.5774, lon: 3.3212 },
  { city: "Abuja", airport: "Nnamdi Azikiwe International Airport", code: "ABV", country: "Nigeria", lat: 9.0068, lon: 7.2632 },
  { city: "London", airport: "Heathrow Airport", code: "LHR", country: "United Kingdom", lat: 51.47, lon: -0.4543 },
  { city: "London", airport: "Gatwick Airport", code: "LGW", country: "United Kingdom" },
  { city: "Dubai", airport: "Dubai International Airport", code: "DXB", country: "United Arab Emirates", lat: 25.2532, lon: 55.3657 },
  { city: "Doha", airport: "Hamad International Airport", code: "DOH", country: "Qatar" },
  { city: "Paris", airport: "Charles de Gaulle Airport", code: "CDG", country: "France", lat: 49.0097, lon: 2.5479 },
  { city: "New York", airport: "John F. Kennedy International Airport", code: "JFK", country: "United States", lat: 40.6413, lon: -73.7781 },
  { city: "Istanbul", airport: "Istanbul Airport", code: "IST", country: "Türkiye" },
  { city: "Nairobi", airport: "Jomo Kenyatta International Airport", code: "NBO", country: "Kenya" },
  { city: "Johannesburg", airport: "O.R. Tambo International Airport", code: "JNB", country: "South Africa" },
  { city: "Toronto", airport: "Toronto Pearson International Airport", code: "YYZ", country: "Canada", lat: 43.6777, lon: -79.6248 },
  { city: "Houston", airport: "George Bush Intercontinental Airport", code: "IAH", country: "United States" },
];

export function formatAirportLabel(airport: AirportOption) {
  return `${airport.city} (${airport.code})`;
}
