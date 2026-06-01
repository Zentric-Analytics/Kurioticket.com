import Image from "next/image";
import Link from "next/link";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

type RegionName =
  | "Europe"
  | "North America"
  | "Asia"
  | "Africa"
  | "Middle East"
  | "South America"
  | "Caribbean"
  | "Oceania";

type DestinationSeed = {
  name: string;
  country: string;
  image: string;
};

type Destination = DestinationSeed & {
  region: RegionName;
  imageAlt: string;
  tag: string;
};

type DestinationSection = {
  region: RegionName;
  accent: string;
  summary: string;
  destinations: Destination[];
};

function getDestinationPhotoUrl(name: string, country: string) {
  const locationQuery = encodeURIComponent(
    `${name} ${country} landmark skyline travel`,
  );
  const uniqueKey = encodeURIComponent(
    `${name}-${country}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  );

  return `https://source.unsplash.com/1200x800/?${locationQuery}&sig=${uniqueKey}`;
}

const destinationTags = [
  "skyline glow",
  "old town lanes",
  "beachfront escape",
  "food market nights",
  "museum weekend",
  "garden district",
  "harbor views",
  "sunset boulevard",
] as const;

const destinationSubtitle = "Explore flights, hotels, and travel deals";

const regionDetails: Record<
  RegionName,
  Pick<DestinationSection, "accent" | "summary">
> = {
  Europe: {
    accent: "from-blue-600 to-violet-600",
    summary:
      "Layered history, food capitals, museums, nightlife, and quick city-to-city getaways.",
  },
  "North America": {
    accent: "from-sky-600 to-indigo-700",
    summary:
      "Big skylines, national parks, entertainment hubs, beaches, and family-friendly escapes.",
  },
  Asia: {
    accent: "from-rose-500 to-violet-700",
    summary:
      "Street food, temples, neon city breaks, island stays, shopping, and cultural adventures.",
  },
  Africa: {
    accent: "from-emerald-600 to-violet-600",
    summary:
      "Safari gateways, creative capitals, desert landscapes, beaches, and unforgettable nature.",
  },
  "Middle East": {
    accent: "from-amber-500 to-fuchsia-600",
    summary:
      "Statement skylines, desert escapes, heritage sites, warm coasts, and luxury stays.",
  },
  "South America": {
    accent: "from-lime-600 to-cyan-700",
    summary:
      "Mountain scenery, rainforest routes, colorful cities, beaches, and food-led adventures.",
  },
  Caribbean: {
    accent: "from-cyan-500 to-blue-700",
    summary:
      "Island-hopping favorites with turquoise water, music, beach resorts, and laid-back sunshine.",
  },
  Oceania: {
    accent: "from-teal-500 to-indigo-700",
    summary:
      "Coastal cities, reef adventures, island retreats, wine regions, and dramatic road trips.",
  },
};

const destinationCatalog: Record<RegionName, DestinationSeed[]> = {
  Europe: [
    {
      name: "London",
      country: "United Kingdom",
      image: getDestinationPhotoUrl("London", "United Kingdom"),
    },
    {
      name: "Paris",
      country: "France",
      image: getDestinationPhotoUrl("Paris", "France"),
    },
    {
      name: "Rome",
      country: "Italy",
      image: getDestinationPhotoUrl("Rome", "Italy"),
    },
    {
      name: "Barcelona",
      country: "Spain",
      image: getDestinationPhotoUrl("Barcelona", "Spain"),
    },
    {
      name: "Amsterdam",
      country: "Netherlands",
      image: getDestinationPhotoUrl("Amsterdam", "Netherlands"),
    },
    {
      name: "Berlin",
      country: "Germany",
      image: getDestinationPhotoUrl("Berlin", "Germany"),
    },
    {
      name: "Madrid",
      country: "Spain",
      image: getDestinationPhotoUrl("Madrid", "Spain"),
    },
    {
      name: "Lisbon",
      country: "Portugal",
      image: getDestinationPhotoUrl("Lisbon", "Portugal"),
    },
    {
      name: "Prague",
      country: "Czechia",
      image: getDestinationPhotoUrl("Prague", "Czechia"),
    },
    {
      name: "Vienna",
      country: "Austria",
      image: getDestinationPhotoUrl("Vienna", "Austria"),
    },
    {
      name: "Athens",
      country: "Greece",
      image: getDestinationPhotoUrl("Athens", "Greece"),
    },
    {
      name: "Dublin",
      country: "Ireland",
      image: getDestinationPhotoUrl("Dublin", "Ireland"),
    },
    {
      name: "Copenhagen",
      country: "Denmark",
      image: getDestinationPhotoUrl("Copenhagen", "Denmark"),
    },
    {
      name: "Stockholm",
      country: "Sweden",
      image: getDestinationPhotoUrl("Stockholm", "Sweden"),
    },
    {
      name: "Oslo",
      country: "Norway",
      image: getDestinationPhotoUrl("Oslo", "Norway"),
    },
    {
      name: "Budapest",
      country: "Hungary",
      image: getDestinationPhotoUrl("Budapest", "Hungary"),
    },
    {
      name: "Florence",
      country: "Italy",
      image: getDestinationPhotoUrl("Florence", "Italy"),
    },
    {
      name: "Venice",
      country: "Italy",
      image: getDestinationPhotoUrl("Venice", "Italy"),
    },
    {
      name: "Edinburgh",
      country: "United Kingdom",
      image: getDestinationPhotoUrl("Edinburgh", "United Kingdom"),
    },
    {
      name: "Reykjavik",
      country: "Iceland",
      image: getDestinationPhotoUrl("Reykjavik", "Iceland"),
    },
  ],
  "North America": [
    {
      name: "New York",
      country: "United States",
      image: getDestinationPhotoUrl("New York", "United States"),
    },
    {
      name: "Los Angeles",
      country: "United States",
      image: getDestinationPhotoUrl("Los Angeles", "United States"),
    },
    {
      name: "Chicago",
      country: "United States",
      image: getDestinationPhotoUrl("Chicago", "United States"),
    },
    {
      name: "Miami",
      country: "United States",
      image: getDestinationPhotoUrl("Miami", "United States"),
    },
    {
      name: "San Francisco",
      country: "United States",
      image: getDestinationPhotoUrl("San Francisco", "United States"),
    },
    {
      name: "Las Vegas",
      country: "United States",
      image: getDestinationPhotoUrl("Las Vegas", "United States"),
    },
    {
      name: "Seattle",
      country: "United States",
      image: getDestinationPhotoUrl("Seattle", "United States"),
    },
    {
      name: "Boston",
      country: "United States",
      image: getDestinationPhotoUrl("Boston", "United States"),
    },
    {
      name: "Washington",
      country: "United States",
      image: getDestinationPhotoUrl("Washington", "United States"),
    },
    {
      name: "Orlando",
      country: "United States",
      image: getDestinationPhotoUrl("Orlando", "United States"),
    },
    {
      name: "Toronto",
      country: "Canada",
      image: getDestinationPhotoUrl("Toronto", "Canada"),
    },
    {
      name: "Vancouver",
      country: "Canada",
      image: getDestinationPhotoUrl("Vancouver", "Canada"),
    },
    {
      name: "Montreal",
      country: "Canada",
      image: getDestinationPhotoUrl("Montreal", "Canada"),
    },
    {
      name: "Calgary",
      country: "Canada",
      image: getDestinationPhotoUrl("Calgary", "Canada"),
    },
    {
      name: "Quebec City",
      country: "Canada",
      image: getDestinationPhotoUrl("Quebec City", "Canada"),
    },
    {
      name: "Mexico City",
      country: "Mexico",
      image: getDestinationPhotoUrl("Mexico City", "Mexico"),
    },
    {
      name: "Cancun",
      country: "Mexico",
      image: getDestinationPhotoUrl("Cancun", "Mexico"),
    },
    {
      name: "Guadalajara",
      country: "Mexico",
      image: getDestinationPhotoUrl("Guadalajara", "Mexico"),
    },
    {
      name: "Monterrey",
      country: "Mexico",
      image: getDestinationPhotoUrl("Monterrey", "Mexico"),
    },
    {
      name: "Tulum",
      country: "Mexico",
      image: getDestinationPhotoUrl("Tulum", "Mexico"),
    },
  ],
  Asia: [
    {
      name: "Tokyo",
      country: "Japan",
      image: getDestinationPhotoUrl("Tokyo", "Japan"),
    },
    {
      name: "Seoul",
      country: "South Korea",
      image: getDestinationPhotoUrl("Seoul", "South Korea"),
    },
    {
      name: "Bangkok",
      country: "Thailand",
      image: getDestinationPhotoUrl("Bangkok", "Thailand"),
    },
    {
      name: "Singapore",
      country: "Singapore",
      image: getDestinationPhotoUrl("Singapore", "Singapore"),
    },
    {
      name: "Hong Kong",
      country: "Hong Kong",
      image: getDestinationPhotoUrl("Hong Kong", "Hong Kong"),
    },
    {
      name: "Kuala Lumpur",
      country: "Malaysia",
      image: getDestinationPhotoUrl("Kuala Lumpur", "Malaysia"),
    },
    {
      name: "Bali",
      country: "Indonesia",
      image: getDestinationPhotoUrl("Bali", "Indonesia"),
    },
    {
      name: "Jakarta",
      country: "Indonesia",
      image: getDestinationPhotoUrl("Jakarta", "Indonesia"),
    },
    {
      name: "Hanoi",
      country: "Vietnam",
      image: getDestinationPhotoUrl("Hanoi", "Vietnam"),
    },
    {
      name: "Ho Chi Minh City",
      country: "Vietnam",
      image: getDestinationPhotoUrl("Ho Chi Minh City", "Vietnam"),
    },
    {
      name: "Manila",
      country: "Philippines",
      image: getDestinationPhotoUrl("Manila", "Philippines"),
    },
    {
      name: "Taipei",
      country: "Taiwan",
      image: getDestinationPhotoUrl("Taipei", "Taiwan"),
    },
    {
      name: "Shanghai",
      country: "China",
      image: getDestinationPhotoUrl("Shanghai", "China"),
    },
    {
      name: "Beijing",
      country: "China",
      image: getDestinationPhotoUrl("Beijing", "China"),
    },
    {
      name: "Mumbai",
      country: "India",
      image: getDestinationPhotoUrl("Mumbai", "India"),
    },
    {
      name: "Delhi",
      country: "India",
      image: getDestinationPhotoUrl("Delhi", "India"),
    },
    {
      name: "Jaipur",
      country: "India",
      image: getDestinationPhotoUrl("Jaipur", "India"),
    },
    {
      name: "Phuket",
      country: "Thailand",
      image: getDestinationPhotoUrl("Phuket", "Thailand"),
    },
    {
      name: "Chiang Mai",
      country: "Thailand",
      image: getDestinationPhotoUrl("Chiang Mai", "Thailand"),
    },
    {
      name: "Kyoto",
      country: "Japan",
      image: getDestinationPhotoUrl("Kyoto", "Japan"),
    },
  ],
  Africa: [
    {
      name: "Cape Town",
      country: "South Africa",
      image: getDestinationPhotoUrl("Cape Town", "South Africa"),
    },
    {
      name: "Johannesburg",
      country: "South Africa",
      image: getDestinationPhotoUrl("Johannesburg", "South Africa"),
    },
    {
      name: "Nairobi",
      country: "Kenya",
      image: getDestinationPhotoUrl("Nairobi", "Kenya"),
    },
    {
      name: "Marrakech",
      country: "Morocco",
      image: getDestinationPhotoUrl("Marrakech", "Morocco"),
    },
    {
      name: "Casablanca",
      country: "Morocco",
      image: getDestinationPhotoUrl("Casablanca", "Morocco"),
    },
    {
      name: "Cairo",
      country: "Egypt",
      image: getDestinationPhotoUrl("Cairo", "Egypt"),
    },
    {
      name: "Lagos",
      country: "Nigeria",
      image: getDestinationPhotoUrl("Lagos", "Nigeria"),
    },
    {
      name: "Abuja",
      country: "Nigeria",
      image: getDestinationPhotoUrl("Abuja", "Nigeria"),
    },
    {
      name: "Accra",
      country: "Ghana",
      image: getDestinationPhotoUrl("Accra", "Ghana"),
    },
    {
      name: "Dakar",
      country: "Senegal",
      image: getDestinationPhotoUrl("Dakar", "Senegal"),
    },
    {
      name: "Addis Ababa",
      country: "Ethiopia",
      image: getDestinationPhotoUrl("Addis Ababa", "Ethiopia"),
    },
    {
      name: "Zanzibar",
      country: "Tanzania",
      image: getDestinationPhotoUrl("Zanzibar", "Tanzania"),
    },
    {
      name: "Kigali",
      country: "Rwanda",
      image: getDestinationPhotoUrl("Kigali", "Rwanda"),
    },
    {
      name: "Victoria Falls",
      country: "Zimbabwe",
      image: getDestinationPhotoUrl("Victoria Falls", "Zimbabwe"),
    },
    {
      name: "Windhoek",
      country: "Namibia",
      image: getDestinationPhotoUrl("Windhoek", "Namibia"),
    },
    {
      name: "Gaborone",
      country: "Botswana",
      image: getDestinationPhotoUrl("Gaborone", "Botswana"),
    },
    {
      name: "Tunis",
      country: "Tunisia",
      image: getDestinationPhotoUrl("Tunis", "Tunisia"),
    },
    {
      name: "Algiers",
      country: "Algeria",
      image: getDestinationPhotoUrl("Algiers", "Algeria"),
    },
    {
      name: "Mauritius",
      country: "Mauritius",
      image: getDestinationPhotoUrl("Mauritius", "Mauritius"),
    },
    {
      name: "Seychelles",
      country: "Seychelles",
      image: getDestinationPhotoUrl("Seychelles", "Seychelles"),
    },
  ],
  "Middle East": [
    {
      name: "Dubai",
      country: "United Arab Emirates",
      image: getDestinationPhotoUrl("Dubai", "United Arab Emirates"),
    },
    {
      name: "Abu Dhabi",
      country: "United Arab Emirates",
      image: getDestinationPhotoUrl("Abu Dhabi", "United Arab Emirates"),
    },
    {
      name: "Doha",
      country: "Qatar",
      image: getDestinationPhotoUrl("Doha", "Qatar"),
    },
    {
      name: "Riyadh",
      country: "Saudi Arabia",
      image: getDestinationPhotoUrl("Riyadh", "Saudi Arabia"),
    },
    {
      name: "Jeddah",
      country: "Saudi Arabia",
      image: getDestinationPhotoUrl("Jeddah", "Saudi Arabia"),
    },
    {
      name: "Muscat",
      country: "Oman",
      image: getDestinationPhotoUrl("Muscat", "Oman"),
    },
    {
      name: "Manama",
      country: "Bahrain",
      image: getDestinationPhotoUrl("Manama", "Bahrain"),
    },
    {
      name: "Kuwait City",
      country: "Kuwait",
      image: getDestinationPhotoUrl("Kuwait City", "Kuwait"),
    },
    {
      name: "Amman",
      country: "Jordan",
      image: getDestinationPhotoUrl("Amman", "Jordan"),
    },
    {
      name: "Petra",
      country: "Jordan",
      image: getDestinationPhotoUrl("Petra", "Jordan"),
    },
    {
      name: "Beirut",
      country: "Lebanon",
      image: getDestinationPhotoUrl("Beirut", "Lebanon"),
    },
    {
      name: "Tel Aviv",
      country: "Israel",
      image: getDestinationPhotoUrl("Tel Aviv", "Israel"),
    },
    {
      name: "Jerusalem",
      country: "Israel",
      image: getDestinationPhotoUrl("Jerusalem", "Israel"),
    },
    {
      name: "Istanbul",
      country: "Turkey",
      image: getDestinationPhotoUrl("Istanbul", "Turkey"),
    },
    {
      name: "Cappadocia",
      country: "Turkey",
      image: getDestinationPhotoUrl("Cappadocia", "Turkey"),
    },
    {
      name: "Ankara",
      country: "Turkey",
      image: getDestinationPhotoUrl("Ankara", "Turkey"),
    },
    {
      name: "Bodrum",
      country: "Turkey",
      image: getDestinationPhotoUrl("Bodrum", "Turkey"),
    },
    {
      name: "Antalya",
      country: "Turkey",
      image: getDestinationPhotoUrl("Antalya", "Turkey"),
    },
    {
      name: "Salalah",
      country: "Oman",
      image: getDestinationPhotoUrl("Salalah", "Oman"),
    },
    {
      name: "AlUla",
      country: "Saudi Arabia",
      image: getDestinationPhotoUrl("AlUla", "Saudi Arabia"),
    },
  ],
  "South America": [
    {
      name: "Buenos Aires",
      country: "Argentina",
      image: getDestinationPhotoUrl("Buenos Aires", "Argentina"),
    },
    {
      name: "Rio de Janeiro",
      country: "Brazil",
      image: getDestinationPhotoUrl("Rio de Janeiro", "Brazil"),
    },
    {
      name: "Sao Paulo",
      country: "Brazil",
      image: getDestinationPhotoUrl("Sao Paulo", "Brazil"),
    },
    {
      name: "Lima",
      country: "Peru",
      image: getDestinationPhotoUrl("Lima", "Peru"),
    },
    {
      name: "Cusco",
      country: "Peru",
      image: getDestinationPhotoUrl("Cusco", "Peru"),
    },
    {
      name: "Santiago",
      country: "Chile",
      image: getDestinationPhotoUrl("Santiago", "Chile"),
    },
    {
      name: "Bogota",
      country: "Colombia",
      image: getDestinationPhotoUrl("Bogota", "Colombia"),
    },
    {
      name: "Cartagena",
      country: "Colombia",
      image: getDestinationPhotoUrl("Cartagena", "Colombia"),
    },
    {
      name: "Medellin",
      country: "Colombia",
      image: getDestinationPhotoUrl("Medellin", "Colombia"),
    },
    {
      name: "Quito",
      country: "Ecuador",
      image: getDestinationPhotoUrl("Quito", "Ecuador"),
    },
    {
      name: "Galapagos Islands",
      country: "Ecuador",
      image: getDestinationPhotoUrl("Galapagos Islands", "Ecuador"),
    },
    {
      name: "Montevideo",
      country: "Uruguay",
      image: getDestinationPhotoUrl("Montevideo", "Uruguay"),
    },
    {
      name: "Punta del Este",
      country: "Uruguay",
      image: getDestinationPhotoUrl("Punta del Este", "Uruguay"),
    },
    {
      name: "La Paz",
      country: "Bolivia",
      image: getDestinationPhotoUrl("La Paz", "Bolivia"),
    },
    {
      name: "Uyuni",
      country: "Bolivia",
      image: getDestinationPhotoUrl("Uyuni", "Bolivia"),
    },
    {
      name: "Asuncion",
      country: "Paraguay",
      image: getDestinationPhotoUrl("Asuncion", "Paraguay"),
    },
    {
      name: "Georgetown",
      country: "Guyana",
      image: getDestinationPhotoUrl("Georgetown", "Guyana"),
    },
    {
      name: "Mendoza",
      country: "Argentina",
      image: getDestinationPhotoUrl("Mendoza", "Argentina"),
    },
    {
      name: "Florianopolis",
      country: "Brazil",
      image: getDestinationPhotoUrl("Florianopolis", "Brazil"),
    },
    {
      name: "Manaus",
      country: "Brazil",
      image: getDestinationPhotoUrl("Manaus", "Brazil"),
    },
  ],
  Caribbean: [
    {
      name: "Nassau",
      country: "Bahamas",
      image: getDestinationPhotoUrl("Nassau", "Bahamas"),
    },
    {
      name: "Montego Bay",
      country: "Jamaica",
      image: getDestinationPhotoUrl("Montego Bay", "Jamaica"),
    },
    {
      name: "Kingston",
      country: "Jamaica",
      image: getDestinationPhotoUrl("Kingston", "Jamaica"),
    },
    {
      name: "Punta Cana",
      country: "Dominican Republic",
      image: getDestinationPhotoUrl("Punta Cana", "Dominican Republic"),
    },
    {
      name: "Santo Domingo",
      country: "Dominican Republic",
      image: getDestinationPhotoUrl("Santo Domingo", "Dominican Republic"),
    },
    {
      name: "San Juan",
      country: "Puerto Rico",
      image: getDestinationPhotoUrl("San Juan", "Puerto Rico"),
    },
    {
      name: "Aruba",
      country: "Aruba",
      image: getDestinationPhotoUrl("Aruba", "Aruba"),
    },
    {
      name: "Curacao",
      country: "Curacao",
      image: getDestinationPhotoUrl("Curacao", "Curacao"),
    },
    {
      name: "Barbados",
      country: "Barbados",
      image: getDestinationPhotoUrl("Barbados", "Barbados"),
    },
    {
      name: "St Lucia",
      country: "Saint Lucia",
      image: getDestinationPhotoUrl("St Lucia", "Saint Lucia"),
    },
    {
      name: "Antigua",
      country: "Antigua and Barbuda",
      image: getDestinationPhotoUrl("Antigua", "Antigua and Barbuda"),
    },
    {
      name: "St Kitts",
      country: "Saint Kitts and Nevis",
      image: getDestinationPhotoUrl("St Kitts", "Saint Kitts and Nevis"),
    },
    {
      name: "Grenada",
      country: "Grenada",
      image: getDestinationPhotoUrl("Grenada", "Grenada"),
    },
    {
      name: "Trinidad",
      country: "Trinidad and Tobago",
      image: getDestinationPhotoUrl("Trinidad", "Trinidad and Tobago"),
    },
    {
      name: "Tobago",
      country: "Trinidad and Tobago",
      image: getDestinationPhotoUrl("Tobago", "Trinidad and Tobago"),
    },
    {
      name: "Grand Cayman",
      country: "Cayman Islands",
      image: getDestinationPhotoUrl("Grand Cayman", "Cayman Islands"),
    },
    {
      name: "Turks and Caicos",
      country: "Turks and Caicos Islands",
      image: getDestinationPhotoUrl("Turks and Caicos", "Turks and Caicos Islands"),
    },
    {
      name: "St Martin",
      country: "Saint Martin",
      image: getDestinationPhotoUrl("St Martin", "Saint Martin"),
    },
    {
      name: "Havana",
      country: "Cuba",
      image: getDestinationPhotoUrl("Havana", "Cuba"),
    },
    {
      name: "Varadero",
      country: "Cuba",
      image: getDestinationPhotoUrl("Varadero", "Cuba"),
    },
  ],
  Oceania: [
    {
      name: "Sydney",
      country: "Australia",
      image: getDestinationPhotoUrl("Sydney", "Australia"),
    },
    {
      name: "Melbourne",
      country: "Australia",
      image: getDestinationPhotoUrl("Melbourne", "Australia"),
    },
    {
      name: "Brisbane",
      country: "Australia",
      image: getDestinationPhotoUrl("Brisbane", "Australia"),
    },
    {
      name: "Perth",
      country: "Australia",
      image: getDestinationPhotoUrl("Perth", "Australia"),
    },
    {
      name: "Adelaide",
      country: "Australia",
      image: getDestinationPhotoUrl("Adelaide", "Australia"),
    },
    {
      name: "Gold Coast",
      country: "Australia",
      image: getDestinationPhotoUrl("Gold Coast", "Australia"),
    },
    {
      name: "Cairns",
      country: "Australia",
      image: getDestinationPhotoUrl("Cairns", "Australia"),
    },
    {
      name: "Hobart",
      country: "Australia",
      image: getDestinationPhotoUrl("Hobart", "Australia"),
    },
    {
      name: "Auckland",
      country: "New Zealand",
      image: getDestinationPhotoUrl("Auckland", "New Zealand"),
    },
    {
      name: "Wellington",
      country: "New Zealand",
      image: getDestinationPhotoUrl("Wellington", "New Zealand"),
    },
    {
      name: "Queenstown",
      country: "New Zealand",
      image: getDestinationPhotoUrl("Queenstown", "New Zealand"),
    },
    {
      name: "Christchurch",
      country: "New Zealand",
      image: getDestinationPhotoUrl("Christchurch", "New Zealand"),
    },
    {
      name: "Rotorua",
      country: "New Zealand",
      image: getDestinationPhotoUrl("Rotorua", "New Zealand"),
    },
    {
      name: "Fiji",
      country: "Fiji",
      image: getDestinationPhotoUrl("Fiji", "Fiji"),
    },
    {
      name: "Nadi",
      country: "Fiji",
      image: getDestinationPhotoUrl("Nadi", "Fiji"),
    },
    {
      name: "Tahiti",
      country: "French Polynesia",
      image: getDestinationPhotoUrl("Tahiti", "French Polynesia"),
    },
    {
      name: "Bora Bora",
      country: "French Polynesia",
      image: getDestinationPhotoUrl("Bora Bora", "French Polynesia"),
    },
    {
      name: "Port Vila",
      country: "Vanuatu",
      image: getDestinationPhotoUrl("Port Vila", "Vanuatu"),
    },
    {
      name: "Apia",
      country: "Samoa",
      image: getDestinationPhotoUrl("Apia", "Samoa"),
    },
    {
      name: "Noumea",
      country: "New Caledonia",
      image: getDestinationPhotoUrl("Noumea", "New Caledonia"),
    },
  ],
};


function assertUniqueDestinationImages(
  catalog: Record<RegionName, DestinationSeed[]>,
) {
  const seenImages = new Map<string, string>();

  for (const destinations of Object.values(catalog)) {
    for (const destination of destinations) {
      const previousDestination = seenImages.get(destination.image);

      if (previousDestination) {
        throw new Error(
          `Duplicate destination image URL for ${destination.name}; already used by ${previousDestination}.`,
        );
      }

      seenImages.set(destination.image, destination.name);
    }
  }
}


// Keep destination images city-specific and unique so discovery cards never collapse back to a shared regional fallback.
assertUniqueDestinationImages(destinationCatalog);

function getDestinationImageAlt(destination: DestinationSeed) {
  return `${destination.name}, ${destination.country} travel photography`;
}

const destinationSections: DestinationSection[] = Object.entries(
  destinationCatalog,
).map(([region, destinations]) => {
  const regionName = region as RegionName;

  return {
    region: regionName,
    ...regionDetails[regionName],
    destinations: destinations.map((destination, destinationIndex) => ({
      ...destination,
      region: regionName,
      image: destination.image,
      imageAlt: getDestinationImageAlt(destination),
      tag: destinationTags[destinationIndex % destinationTags.length],
    })),
  };
});

const totalDestinations = destinationSections.reduce(
  (count, section) => count + section.destinations.length,
  0,
);

function getRegionId(region: string) {
  return region.toLowerCase().replaceAll(" ", "-");
}

function getDestinationHref(destination: Destination) {
  return `/flights/results?destination=${encodeURIComponent(destination.name)}`;
}

export default function DestinationsPage() {
  return (
    <>
      <AppHeader />

      <main className="flex-1 bg-[#f5f7fb] text-slate-950">
        <section className="border-b border-slate-200 bg-white">
          <div className="page-shell py-8 sm:py-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="inline-flex rounded-full bg-violet-50 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-violet-700">
                  Destination discovery
                </p>
                <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
                  Find your next place to go
                </h1>
                <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
                  Browse {totalDestinations} clickable destinations across eight
                  regions, then jump straight into flight results for the city
                  you like.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3 text-center sm:min-w-80">
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-2xl font-black text-slate-950">
                    {totalDestinations}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Destinations
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-2xl font-black text-slate-950">
                    {destinationSections.length}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Regions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
          <div className="page-shell py-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {destinationSections.map((section) => (
                <a
                  key={section.region}
                  href={`#${getRegionId(section.region)}`}
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
                >
                  {section.region}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="page-shell py-8 sm:py-10 lg:py-12">
          <div className="space-y-12">
            {destinationSections.map((section) => (
              <section
                key={section.region}
                id={getRegionId(section.region)}
                className="scroll-mt-24"
              >
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="max-w-3xl">
                    <div
                      className={`mb-3 h-1.5 w-16 rounded-full bg-gradient-to-r ${section.accent}`}
                    />
                    <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                      {section.region}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                      {section.summary}
                    </p>
                  </div>
                  <p className="text-sm font-black text-slate-500">
                    {section.destinations.length} places
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {section.destinations.map((destination) => (
                    <Link
                      key={`${destination.region}-${destination.name}`}
                      href={getDestinationHref(destination)}
                      className="group relative min-h-48 overflow-hidden rounded-[1.35rem] bg-slate-900 p-5 text-white shadow-lg shadow-slate-200/80 outline-none transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-200/60 focus-visible:ring-4 focus-visible:ring-violet-200 sm:min-h-52"
                      aria-label={`Search flights to ${destination.name}`}
                    >
                      <Image
                        src={destination.image}
                        alt={destination.imageAlt}
                        fill
                        unoptimized
                        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition duration-700 ease-out group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/12 via-slate-950/48 to-slate-950/88 transition duration-300 group-hover:from-slate-950/6 group-hover:via-slate-950/42 group-hover:to-slate-950/90" />

                      <div className="relative flex h-full min-h-40 flex-col justify-between sm:min-h-44">
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white/90 ring-1 ring-white/25 backdrop-blur">
                            {destination.country}
                          </span>
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/18 text-lg font-black ring-1 ring-white/25 backdrop-blur transition group-hover:bg-white group-hover:text-violet-700">
                            →
                          </span>
                        </div>

                        <div>
                          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                            {destination.tag}
                          </p>
                          <h3 className="text-2xl font-black tracking-tight drop-shadow-sm">
                            {destination.name}
                          </h3>
                          <p className="mt-2 text-sm font-semibold leading-5 text-white/86">
                            {destinationSubtitle}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
