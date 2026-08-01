export type HomepageAirport = {
  code: string;
  city: string;
  country: string;
  airport: string;
};

export const HOMEPAGE_AIRPORT_RESULT_LIMIT = 20;

/** A bundled catalogue used only by the two airport sheets on the homepage. */
export const homepageAirports: readonly HomepageAirport[] = [
  { code: "LOS", city: "Lagos", country: "Nigeria", airport: "Murtala Muhammed International Airport" },
  { code: "ABV", city: "Abuja", country: "Nigeria", airport: "Nnamdi Azikiwe International Airport" },
  { code: "PHC", city: "Port Harcourt", country: "Nigeria", airport: "Port Harcourt International Airport" },
  { code: "KAN", city: "Kano", country: "Nigeria", airport: "Mallam Aminu Kano International Airport" },
  { code: "ENU", city: "Enugu", country: "Nigeria", airport: "Akanu Ibiam International Airport" },
  { code: "ACC", city: "Accra", country: "Ghana", airport: "Kotoka International Airport" },
  { code: "LHR", city: "London", country: "United Kingdom", airport: "Heathrow Airport" },
  { code: "JFK", city: "New York", country: "United States", airport: "John F. Kennedy International Airport" },
  { code: "DXB", city: "Dubai", country: "United Arab Emirates", airport: "Dubai International Airport" },
  { code: "CDG", city: "Paris", country: "France", airport: "Charles de Gaulle Airport" },
  { code: "JNB", city: "Johannesburg", country: "South Africa", airport: "O. R. Tambo International Airport" },
  { code: "NBO", city: "Nairobi", country: "Kenya", airport: "Jomo Kenyatta International Airport" },
  { code: "CAI", city: "Cairo", country: "Egypt", airport: "Cairo International Airport" },
  { code: "ADD", city: "Addis Ababa", country: "Ethiopia", airport: "Bole International Airport" },
  { code: "AMS", city: "Amsterdam", country: "Netherlands", airport: "Amsterdam Airport Schiphol" },
  { code: "FRA", city: "Frankfurt", country: "Germany", airport: "Frankfurt Airport" },
  { code: "IST", city: "Istanbul", country: "Turkey", airport: "Istanbul Airport" },
  { code: "DOH", city: "Doha", country: "Qatar", airport: "Hamad International Airport" },
  { code: "YYZ", city: "Toronto", country: "Canada", airport: "Toronto Pearson International Airport" },
  { code: "SIN", city: "Singapore", country: "Singapore", airport: "Singapore Changi Airport" },
  { code: "CPT", city: "Cape Town", country: "South Africa", airport: "Cape Town International Airport" },
  { code: "DSS", city: "Dakar", country: "Senegal", airport: "Blaise Diagne International Airport" },
  { code: "KGL", city: "Kigali", country: "Rwanda", airport: "Kigali International Airport" },
  { code: "CMN", city: "Casablanca", country: "Morocco", airport: "Mohammed V International Airport" },
  { code: "ALG", city: "Algiers", country: "Algeria", airport: "Houari Boumediene Airport" },
  { code: "TUN", city: "Tunis", country: "Tunisia", airport: "Tunis-Carthage International Airport" },
  { code: "DAR", city: "Dar es Salaam", country: "Tanzania", airport: "Julius Nyerere International Airport" },
  { code: "EBB", city: "Entebbe", country: "Uganda", airport: "Entebbe International Airport" },
  { code: "LUN", city: "Lusaka", country: "Zambia", airport: "Kenneth Kaunda International Airport" },
  { code: "HRE", city: "Harare", country: "Zimbabwe", airport: "Robert Gabriel Mugabe International Airport" },
  { code: "LAD", city: "Luanda", country: "Angola", airport: "Quatro de Fevereiro Airport" },
  { code: "ROB", city: "Monrovia", country: "Liberia", airport: "Roberts International Airport" },
  { code: "FCO", city: "Rome", country: "Italy", airport: "Leonardo da Vinci-Fiumicino Airport" },
  { code: "MAD", city: "Madrid", country: "Spain", airport: "Adolfo Suarez Madrid-Barajas Airport" },
  { code: "BCN", city: "Barcelona", country: "Spain", airport: "Josep Tarradellas Barcelona-El Prat Airport" },
  { code: "LIS", city: "Lisbon", country: "Portugal", airport: "Humberto Delgado Airport" },
  { code: "ZRH", city: "Zurich", country: "Switzerland", airport: "Zurich Airport" },
  { code: "VIE", city: "Vienna", country: "Austria", airport: "Vienna International Airport" },
  { code: "BRU", city: "Brussels", country: "Belgium", airport: "Brussels Airport" },
  { code: "CPH", city: "Copenhagen", country: "Denmark", airport: "Copenhagen Airport" },
  { code: "ARN", city: "Stockholm", country: "Sweden", airport: "Stockholm Arlanda Airport" },
  { code: "OSL", city: "Oslo", country: "Norway", airport: "Oslo Airport" },
  { code: "DUB", city: "Dublin", country: "Ireland", airport: "Dublin Airport" },
  { code: "ATH", city: "Athens", country: "Greece", airport: "Athens International Airport" },
  { code: "WAW", city: "Warsaw", country: "Poland", airport: "Warsaw Chopin Airport" },
  { code: "PRG", city: "Prague", country: "Czech Republic", airport: "Vaclav Havel Airport Prague" },
  { code: "TLV", city: "Tel Aviv", country: "Israel", airport: "Ben Gurion Airport" },
  { code: "AUH", city: "Abu Dhabi", country: "United Arab Emirates", airport: "Zayed International Airport" },
  { code: "JED", city: "Jeddah", country: "Saudi Arabia", airport: "King Abdulaziz International Airport" },
  { code: "RUH", city: "Riyadh", country: "Saudi Arabia", airport: "King Khalid International Airport" },
  { code: "AMM", city: "Amman", country: "Jordan", airport: "Queen Alia International Airport" },
  { code: "BEY", city: "Beirut", country: "Lebanon", airport: "Beirut-Rafic Hariri International Airport" },
  { code: "MCT", city: "Muscat", country: "Oman", airport: "Muscat International Airport" },
  { code: "LAX", city: "Los Angeles", country: "United States", airport: "Los Angeles International Airport" },
  { code: "ATL", city: "Atlanta", country: "United States", airport: "Hartsfield-Jackson Atlanta International Airport" },
  { code: "ORD", city: "Chicago", country: "United States", airport: "O'Hare International Airport" },
  { code: "DFW", city: "Dallas", country: "United States", airport: "Dallas Fort Worth International Airport" },
  { code: "MIA", city: "Miami", country: "United States", airport: "Miami International Airport" },
  { code: "SFO", city: "San Francisco", country: "United States", airport: "San Francisco International Airport" },
  { code: "IAD", city: "Washington", country: "United States", airport: "Washington Dulles International Airport" },
  { code: "BOS", city: "Boston", country: "United States", airport: "Logan International Airport" },
  { code: "MEX", city: "Mexico City", country: "Mexico", airport: "Mexico City International Airport" },
  { code: "YVR", city: "Vancouver", country: "Canada", airport: "Vancouver International Airport" },
  { code: "GRU", city: "Sao Paulo", country: "Brazil", airport: "Sao Paulo-Guarulhos International Airport" },
  { code: "GIG", city: "Rio de Janeiro", country: "Brazil", airport: "Rio de Janeiro-Galeao International Airport" },
  { code: "EZE", city: "Buenos Aires", country: "Argentina", airport: "Ministro Pistarini International Airport" },
  { code: "SCL", city: "Santiago", country: "Chile", airport: "Arturo Merino Benitez International Airport" },
  { code: "BOG", city: "Bogota", country: "Colombia", airport: "El Dorado International Airport" },
  { code: "LIM", city: "Lima", country: "Peru", airport: "Jorge Chavez International Airport" },
  { code: "PTY", city: "Panama City", country: "Panama", airport: "Tocumen International Airport" },
  { code: "HND", city: "Tokyo", country: "Japan", airport: "Haneda Airport" },
  { code: "NRT", city: "Tokyo", country: "Japan", airport: "Narita International Airport" },
  { code: "ICN", city: "Seoul", country: "South Korea", airport: "Incheon International Airport" },
  { code: "PEK", city: "Beijing", country: "China", airport: "Beijing Capital International Airport" },
  { code: "PVG", city: "Shanghai", country: "China", airport: "Shanghai Pudong International Airport" },
  { code: "HKG", city: "Hong Kong", country: "Hong Kong", airport: "Hong Kong International Airport" },
  { code: "BKK", city: "Bangkok", country: "Thailand", airport: "Suvarnabhumi Airport" },
  { code: "KUL", city: "Kuala Lumpur", country: "Malaysia", airport: "Kuala Lumpur International Airport" },
  { code: "DEL", city: "Delhi", country: "India", airport: "Indira Gandhi International Airport" },
  { code: "BOM", city: "Mumbai", country: "India", airport: "Chhatrapati Shivaji Maharaj International Airport" },
  { code: "CGK", city: "Jakarta", country: "Indonesia", airport: "Soekarno-Hatta International Airport" },
  { code: "MNL", city: "Manila", country: "Philippines", airport: "Ninoy Aquino International Airport" },
  { code: "TPE", city: "Taipei", country: "Taiwan", airport: "Taiwan Taoyuan International Airport" },
  { code: "SYD", city: "Sydney", country: "Australia", airport: "Sydney Kingsford Smith Airport" },
  { code: "MEL", city: "Melbourne", country: "Australia", airport: "Melbourne Airport" },
  { code: "BNE", city: "Brisbane", country: "Australia", airport: "Brisbane Airport" },
  { code: "PER", city: "Perth", country: "Australia", airport: "Perth Airport" },
  { code: "AKL", city: "Auckland", country: "New Zealand", airport: "Auckland Airport" },
  { code: "CHC", city: "Christchurch", country: "New Zealand", airport: "Christchurch International Airport" },
];

const normalizedFields = (airport: HomepageAirport) =>
  [airport.code, airport.airport, airport.city, airport.country].map((field) => field.toLocaleLowerCase());

export function searchHomepageAirports(query: string): HomepageAirport[] {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return homepageAirports.slice(0, HOMEPAGE_AIRPORT_RESULT_LIMIT);

  return homepageAirports
    .map((airport, index) => {
      const fields = normalizedFields(airport);
      const score = airport.code.toLocaleLowerCase() === term ? 0 : fields.some((field) => field.startsWith(term)) ? 1 : 2;
      return { airport, index, score, matches: fields.some((field) => field.includes(term)) };
    })
    .filter((result) => result.matches)
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .slice(0, HOMEPAGE_AIRPORT_RESULT_LIMIT)
    .map((result) => result.airport);
}
