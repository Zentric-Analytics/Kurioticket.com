export type HotelDestinationKind = "city" | "district" | "landmark" | "airport-area";

export type HotelDestinationSuggestion = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region?: string;
  kind: HotelDestinationKind;
  searchValue: string;
  aliases?: string[];
};

const normalizeText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();

const EU_COUNTRY_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
]);

export const hotelDestinations: HotelDestinationSuggestion[] = [
  { id: "us-new-york", name: "New York", region: "New York", country: "United States", countryCode: "US", kind: "city", searchValue: "New York, NY", aliases: ["nyc", "manhattan", "brooklyn"] },
  { id: "us-las-vegas", name: "Las Vegas", region: "Nevada", country: "United States", countryCode: "US", kind: "city", searchValue: "Las Vegas, NV", aliases: ["vegas", "the strip"] },
  { id: "us-orlando", name: "Orlando", region: "Florida", country: "United States", countryCode: "US", kind: "city", searchValue: "Orlando, FL", aliases: ["disney world", "theme parks"] },
  { id: "us-los-angeles", name: "Los Angeles", region: "California", country: "United States", countryCode: "US", kind: "city", searchValue: "Los Angeles, CA", aliases: ["la", "hollywood", "santa monica"] },
  { id: "us-miami", name: "Miami", region: "Florida", country: "United States", countryCode: "US", kind: "city", searchValue: "Miami, FL", aliases: ["south beach", "miami beach"] },
  { id: "us-chicago", name: "Chicago", region: "Illinois", country: "United States", countryCode: "US", kind: "city", searchValue: "Chicago, IL", aliases: ["magnificent mile"] },
  { id: "us-san-francisco", name: "San Francisco", region: "California", country: "United States", countryCode: "US", kind: "city", searchValue: "San Francisco, CA", aliases: ["sf", "fisherman's wharf"] },
  { id: "us-honolulu", name: "Honolulu", region: "Hawaii", country: "United States", countryCode: "US", kind: "city", searchValue: "Honolulu, HI", aliases: ["waikiki", "oahu"] },
  { id: "us-jfk-area", name: "JFK Airport area", region: "New York", country: "United States", countryCode: "US", kind: "airport-area", searchValue: "JFK Airport area, New York", aliases: ["john f kennedy", "jfk"] },

  { id: "gb-london", name: "London", region: "England", country: "United Kingdom", countryCode: "GB", kind: "city", searchValue: "London, United Kingdom", aliases: ["westminster", "soho", "heathrow"] },
  { id: "gb-edinburgh", name: "Edinburgh", region: "Scotland", country: "United Kingdom", countryCode: "GB", kind: "city", searchValue: "Edinburgh, United Kingdom", aliases: ["old town", "royal mile"] },
  { id: "gb-manchester", name: "Manchester", region: "England", country: "United Kingdom", countryCode: "GB", kind: "city", searchValue: "Manchester, United Kingdom" },
  { id: "gb-heathrow-area", name: "Heathrow Airport area", region: "London", country: "United Kingdom", countryCode: "GB", kind: "airport-area", searchValue: "Heathrow Airport area, London", aliases: ["lhr"] },

  { id: "fr-paris", name: "Paris", region: "Île-de-France", country: "France", countryCode: "FR", kind: "city", searchValue: "Paris, France", aliases: ["eiffel tower", "latin quarter", "le marais"] },
  { id: "fr-nice", name: "Nice", region: "French Riviera", country: "France", countryCode: "FR", kind: "city", searchValue: "Nice, France", aliases: ["cote d'azur", "french riviera"] },
  { id: "fr-cdg-area", name: "Charles de Gaulle Airport area", region: "Paris", country: "France", countryCode: "FR", kind: "airport-area", searchValue: "Charles de Gaulle Airport area, Paris", aliases: ["cdg"] },
  { id: "de-berlin", name: "Berlin", country: "Germany", countryCode: "DE", kind: "city", searchValue: "Berlin, Germany", aliases: ["mitte", "brandenburg gate"] },
  { id: "de-munich", name: "Munich", region: "Bavaria", country: "Germany", countryCode: "DE", kind: "city", searchValue: "Munich, Germany", aliases: ["muenchen", "oktoberfest"] },
  { id: "de-frankfurt", name: "Frankfurt", region: "Hesse", country: "Germany", countryCode: "DE", kind: "city", searchValue: "Frankfurt, Germany", aliases: ["frankfurt airport"] },
  { id: "it-rome", name: "Rome", region: "Lazio", country: "Italy", countryCode: "IT", kind: "city", searchValue: "Rome, Italy", aliases: ["roma", "colosseum", "vatican"] },
  { id: "it-milan", name: "Milan", region: "Lombardy", country: "Italy", countryCode: "IT", kind: "city", searchValue: "Milan, Italy", aliases: ["milano", "duomo"] },
  { id: "es-barcelona", name: "Barcelona", region: "Catalonia", country: "Spain", countryCode: "ES", kind: "city", searchValue: "Barcelona, Spain", aliases: ["gothic quarter", "sagrada familia"] },
  { id: "es-madrid", name: "Madrid", country: "Spain", countryCode: "ES", kind: "city", searchValue: "Madrid, Spain", aliases: ["gran via"] },
  { id: "nl-amsterdam", name: "Amsterdam", country: "Netherlands", countryCode: "NL", kind: "city", searchValue: "Amsterdam, Netherlands", aliases: ["canal ring", "schiphol"] },
  { id: "ch-zurich", name: "Zurich", country: "Switzerland", countryCode: "CH", kind: "city", searchValue: "Zurich, Switzerland", aliases: ["zuerich"] },
  { id: "tr-istanbul", name: "Istanbul", country: "Türkiye", countryCode: "TR", kind: "city", searchValue: "Istanbul, Türkiye", aliases: ["sultanahmet", "taksim"] },

  { id: "ca-toronto", name: "Toronto", region: "Ontario", country: "Canada", countryCode: "CA", kind: "city", searchValue: "Toronto, Canada", aliases: ["downtown toronto"] },
  { id: "ca-vancouver", name: "Vancouver", region: "British Columbia", country: "Canada", countryCode: "CA", kind: "city", searchValue: "Vancouver, Canada" },
  { id: "mx-cancun", name: "Cancún", region: "Quintana Roo", country: "Mexico", countryCode: "MX", kind: "city", searchValue: "Cancún, Mexico", aliases: ["cancun", "hotel zone"] },
  { id: "mx-mexico-city", name: "Mexico City", country: "Mexico", countryCode: "MX", kind: "city", searchValue: "Mexico City, Mexico", aliases: ["cdmx", "roma norte", "polanco"] },
  { id: "br-rio", name: "Rio de Janeiro", country: "Brazil", countryCode: "BR", kind: "city", searchValue: "Rio de Janeiro, Brazil", aliases: ["copacabana", "ipanema"] },
  { id: "ar-buenos-aires", name: "Buenos Aires", country: "Argentina", countryCode: "AR", kind: "city", searchValue: "Buenos Aires, Argentina", aliases: ["palermo", "recoleta"] },
  { id: "co-cartagena", name: "Cartagena", country: "Colombia", countryCode: "CO", kind: "city", searchValue: "Cartagena, Colombia", aliases: ["walled city"] },
  { id: "pe-lima", name: "Lima", country: "Peru", countryCode: "PE", kind: "city", searchValue: "Lima, Peru", aliases: ["miraflores"] },

  { id: "jp-tokyo", name: "Tokyo", country: "Japan", countryCode: "JP", kind: "city", searchValue: "Tokyo, Japan", aliases: ["shinjuku", "shibuya", "haneda", "narita"] },
  { id: "jp-kyoto", name: "Kyoto", country: "Japan", countryCode: "JP", kind: "city", searchValue: "Kyoto, Japan", aliases: ["gion"] },
  { id: "kr-seoul", name: "Seoul", country: "South Korea", countryCode: "KR", kind: "city", searchValue: "Seoul, South Korea", aliases: ["gangnam", "myeongdong"] },
  { id: "cn-shanghai", name: "Shanghai", country: "China", countryCode: "CN", kind: "city", searchValue: "Shanghai, China", aliases: ["the bund", "pudong"] },
  { id: "hk-hong-kong", name: "Hong Kong", country: "Hong Kong", countryCode: "HK", kind: "city", searchValue: "Hong Kong", aliases: ["kowloon", "central"] },
  { id: "sg-singapore", name: "Singapore", country: "Singapore", countryCode: "SG", kind: "city", searchValue: "Singapore", aliases: ["marina bay", "sentosa", "changi"] },
  { id: "th-bangkok", name: "Bangkok", country: "Thailand", countryCode: "TH", kind: "city", searchValue: "Bangkok, Thailand", aliases: ["sukhumvit", "siam"] },
  { id: "id-bali", name: "Bali", country: "Indonesia", countryCode: "ID", kind: "district", searchValue: "Bali, Indonesia", aliases: ["ubud", "seminyak", "canggu"] },
  { id: "my-kuala-lumpur", name: "Kuala Lumpur", country: "Malaysia", countryCode: "MY", kind: "city", searchValue: "Kuala Lumpur, Malaysia", aliases: ["bukit bintang"] },
  { id: "ph-manila", name: "Manila", country: "Philippines", countryCode: "PH", kind: "city", searchValue: "Manila, Philippines", aliases: ["makati", "bonifacio global city", "bgc"] },
  { id: "in-mumbai", name: "Mumbai", region: "Maharashtra", country: "India", countryCode: "IN", kind: "city", searchValue: "Mumbai, India", aliases: ["bombay", "bandra"] },
  { id: "in-delhi", name: "Delhi", country: "India", countryCode: "IN", kind: "city", searchValue: "Delhi, India", aliases: ["new delhi", "connaught place"] },

  { id: "ae-dubai", name: "Dubai", country: "United Arab Emirates", countryCode: "AE", kind: "city", searchValue: "Dubai, United Arab Emirates", aliases: ["downtown dubai", "jumeirah", "dxb"] },
  { id: "ae-abu-dhabi", name: "Abu Dhabi", country: "United Arab Emirates", countryCode: "AE", kind: "city", searchValue: "Abu Dhabi, United Arab Emirates", aliases: ["yas island"] },
  { id: "sa-riyadh", name: "Riyadh", country: "Saudi Arabia", countryCode: "SA", kind: "city", searchValue: "Riyadh, Saudi Arabia" },
  { id: "eg-cairo", name: "Cairo", country: "Egypt", countryCode: "EG", kind: "city", searchValue: "Cairo, Egypt", aliases: ["giza", "pyramids"] },
  { id: "ma-marrakesh", name: "Marrakesh", country: "Morocco", countryCode: "MA", kind: "city", searchValue: "Marrakesh, Morocco", aliases: ["marrakech", "medina"] },
  { id: "za-cape-town", name: "Cape Town", country: "South Africa", countryCode: "ZA", kind: "city", searchValue: "Cape Town, South Africa", aliases: ["waterfront", "camps bay"] },
  { id: "ke-nairobi", name: "Nairobi", country: "Kenya", countryCode: "KE", kind: "city", searchValue: "Nairobi, Kenya", aliases: ["westlands"] },
  { id: "ng-lagos", name: "Lagos", country: "Nigeria", countryCode: "NG", kind: "city", searchValue: "Lagos, Nigeria", aliases: ["victoria island", "ikeja", "lekki"] },
  { id: "ng-abuja", name: "Abuja", country: "Nigeria", countryCode: "NG", kind: "city", searchValue: "Abuja, Nigeria", aliases: ["maitama", "wuse"] },
  { id: "gh-accra", name: "Accra", country: "Ghana", countryCode: "GH", kind: "city", searchValue: "Accra, Ghana", aliases: ["osu", "airport city"] },

  { id: "au-sydney", name: "Sydney", region: "New South Wales", country: "Australia", countryCode: "AU", kind: "city", searchValue: "Sydney, Australia", aliases: ["darling harbour", "bondi"] },
  { id: "au-melbourne", name: "Melbourne", region: "Victoria", country: "Australia", countryCode: "AU", kind: "city", searchValue: "Melbourne, Australia" },
];

const defaultGlobalDestinationIds = [
  "gb-london",
  "fr-paris",
  "it-rome",
  "jp-tokyo",
  "ae-dubai",
  "us-new-york",
  "sg-singapore",
  "ng-lagos",
];

const normalizeCountryHint = (countryCode?: string | null) => {
  const normalized = countryCode?.trim().toUpperCase() || "";
  if (normalized === "EU") return normalized;
  return /^[A-Z]{2}$/.test(normalized) ? normalized : "";
};

const countryMatchesHint = (destination: HotelDestinationSuggestion, countryHint: string) => {
  if (!countryHint) return false;
  if (countryHint === "EU") return EU_COUNTRY_CODES.has(destination.countryCode);
  return destination.countryCode === countryHint;
};

const primarySearchTextForDestination = (destination: HotelDestinationSuggestion) =>
  [destination.name, destination.searchValue, ...(destination.aliases ?? [])]
    .filter(Boolean)
    .map((value) => normalizeText(String(value)));

const contextSearchTextForDestination = (destination: HotelDestinationSuggestion) =>
  [destination.region, destination.country, destination.countryCode, destination.kind.replace("-", " ")]
    .filter(Boolean)
    .map((value) => normalizeText(String(value)));

const hasWordStartingWith = (value: string, query: string) =>
  value.split(/\s+/).some((part) => part.startsWith(query));

export function searchHotelDestinations({
  query,
  countryCode,
  limit = 8,
}: {
  query?: string;
  countryCode?: string | null;
  limit?: number;
}) {
  const normalizedQuery = normalizeText(query ?? "");
  const normalizedCountryHint = normalizeCountryHint(countryCode);

  const scored = hotelDestinations
    .map((destination, index) => {
      const primarySearchText = primarySearchTextForDestination(destination);
      const contextSearchText = contextSearchTextForDestination(destination);
      const directName = normalizeText(destination.name);
      const directSearchValue = normalizeText(destination.searchValue);
      const primaryContainsQuery = primarySearchText.some((value) => value.includes(normalizedQuery));
      const contextStartsWithQuery = contextSearchText.some((value) =>
        hasWordStartingWith(value, normalizedQuery),
      );
      const matchesQuery = !normalizedQuery || primaryContainsQuery || contextStartsWithQuery;

      if (!matchesQuery) return null;

      let score = 0;
      if (normalizedQuery) {
        if (directName === normalizedQuery || directSearchValue === normalizedQuery) score += 120;
        if (directName.startsWith(normalizedQuery)) score += 80;
        if (directSearchValue.startsWith(normalizedQuery)) score += 60;
        if (primarySearchText.some((value) => hasWordStartingWith(value, normalizedQuery))) score += 35;
        if (primaryContainsQuery) score += 20;
        if (contextStartsWithQuery) score += 10;
      } else {
        score += defaultGlobalDestinationIds.includes(destination.id) ? 25 : 0;
      }

      if (countryMatchesHint(destination, normalizedCountryHint)) score += 45;
      if (destination.kind === "city") score += 8;
      if (destination.kind === "airport-area") score -= 6;

      return { destination, score, index };
    })
    .filter((item): item is { destination: HotelDestinationSuggestion; score: number; index: number } => Boolean(item))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.destination);

  if (normalizedQuery) {
    return scored.slice(0, limit);
  }

  const countryDefaults = scored.filter((destination) =>
    countryMatchesHint(destination, normalizedCountryHint),
  );
  const globalDefaults = defaultGlobalDestinationIds
    .map((id) => hotelDestinations.find((destination) => destination.id === id))
    .filter((destination): destination is HotelDestinationSuggestion => Boolean(destination));

  const merged = [...countryDefaults, ...globalDefaults];
  const seen = new Set<string>();
  return merged
    .filter((destination) => {
      if (seen.has(destination.id)) return false;
      seen.add(destination.id);
      return true;
    })
    .slice(0, limit);
}
