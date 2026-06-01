import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { DestinationCard } from "./DestinationCard";

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

const curatedDestinationPhotos: Record<string, string> = {
  "London|United Kingdom":
    "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=1200&q=80",
  "Paris|France":
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
  "Rome|Italy":
    "https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=1200&q=80",
  "Barcelona|Spain":
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80",
  "Amsterdam|Netherlands":
    "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1200&q=80",
  "Berlin|Germany":
    "https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1200&q=80",
  "Dubai|United Arab Emirates":
    "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
  "New York|United States":
    "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?auto=format&fit=crop&w=1200&q=80",
  "Istanbul|Turkey":
    "https://images.unsplash.com/photo-1527838832700-5059252407fa?auto=format&fit=crop&w=1200&q=80",
  "Las Vegas|United States":
    "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?auto=format&fit=crop&w=1200&q=80",
  "Tokyo|Japan":
    "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80",
  "Singapore|Singapore":
    "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80",
  "Lagos|Nigeria":
    "https://images.pexels.com/photos/32014864/pexels-photo-32014864.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "Abuja|Nigeria":
    "https://images.pexels.com/photos/20453360/pexels-photo-20453360.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "Cape Town|South Africa":
    "https://images.pexels.com/photos/35398305/pexels-photo-35398305.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "Nairobi|Kenya":
    "https://images.unsplash.com/photo-1523805009345-7448845a9e53?auto=format&fit=crop&w=1200&q=80",
  "Toronto|Canada":
    "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?auto=format&fit=crop&w=1200&q=80",
  "Los Angeles|United States":
    "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?auto=format&fit=crop&w=1200&q=80",
  "Bangkok|Thailand":
    "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80",
  "Kuala Lumpur|Malaysia":
    "https://images.pexels.com/photos/33196113/pexels-photo-33196113.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "Miami|United States":
    "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80",
  "Orlando|United States":
    "https://images.unsplash.com/photo-1597466599360-3b9775841aec?auto=format&fit=crop&w=1200&q=80",
  "Chicago|United States":
    "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?auto=format&fit=crop&w=1200&q=80",
  "San Francisco|United States":
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80",
  "Seattle|United States":
    "https://images.unsplash.com/photo-1502175353174-a7a70e73b362?auto=format&fit=crop&w=1200&q=80",
  "Washington|United States":
    "https://images.unsplash.com/photo-1617581629397-a72507c3de9e?auto=format&fit=crop&w=1200&q=80",
  "Vancouver|Canada":
    "https://images.unsplash.com/photo-1578922746465-3a80a228f223?auto=format&fit=crop&w=1200&q=80",
  "Cancun|Mexico":
    "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=1200&q=80",
  "Mexico City|Mexico":
    "https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?auto=format&fit=crop&w=1200&q=80",
  "Madrid|Spain":
    "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=80",
  "Doha|Qatar":
    "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=1200&q=80",
  "Accra|Ghana":
    "https://images.unsplash.com/photo-1553901753-215db3446770?auto=format&fit=crop&w=1200&q=80",
  "Cairo|Egypt":
    "https://images.unsplash.com/photo-1539650116574-75c0c6d73f56?auto=format&fit=crop&w=1200&q=80",
  "Casablanca|Morocco":
    "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80",
};

const priorityDestinationPhotoKeys = [
  "London|United Kingdom",
  "Paris|France",
  "Rome|Italy",
  "Barcelona|Spain",
  "Amsterdam|Netherlands",
  "Berlin|Germany",
  "Dubai|United Arab Emirates",
  "New York|United States",
  "Istanbul|Turkey",
  "Las Vegas|United States",
  "Tokyo|Japan",
  "Singapore|Singapore",
  "Lagos|Nigeria",
  "Abuja|Nigeria",
  "Cape Town|South Africa",
  "Nairobi|Kenya",
  "Toronto|Canada",
  "Los Angeles|United States",
  "Bangkok|Thailand",
  "Kuala Lumpur|Malaysia",
] as const;

const destinationPhotoSeeds = Array.from({ length: 160 }, (_, index) =>
  String(24001 + index),
);

let nextDestinationPhotoSeedIndex = 0;

function getDestinationFallbackPhotoUrl() {
  const photoSeed = destinationPhotoSeeds[nextDestinationPhotoSeedIndex];

  if (!photoSeed) {
    throw new Error(
      "Every destination must have a unique photographic image seed.",
    );
  }

  nextDestinationPhotoSeedIndex += 1;

  return `https://picsum.photos/seed/${photoSeed}/1200/800.jpg`;
}

function getDestinationPhotoUrl(name: string, country: string) {
  return (
    curatedDestinationPhotos[`${name}|${country}`] ??
    getDestinationFallbackPhotoUrl()
  );
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



const photographicImageSourcePatterns = [
  /^https:\/\/images\.unsplash\.com\/photo-[A-Za-z0-9_-]+\?.+$/,
  /^https:\/\/images\.pexels\.com\/photos\/\d+\/pexels-photo-\d+\.jpeg\?.+$/,
  /^https:\/\/picsum\.photos\/seed\/\d+\/1200\/800\.jpg$/,
];

function assertPhotographicDestinationImages(
  catalog: Record<RegionName, DestinationSeed[]>,
) {
  for (const destinations of Object.values(catalog)) {
    for (const destination of destinations) {
      const hasPhotographicSource = photographicImageSourcePatterns.some(
        (pattern) => pattern.test(destination.image),
      );

      if (!hasPhotographicSource) {
        throw new Error(
          `Destination image for ${destination.name} must be a curated photographic image URL or numeric seeded fallback, not a prompt, search phrase, SVG, or generated illustration.`,
        );
      }
    }
  }
}

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


function assertPriorityDestinationPhotos() {
  for (const destinationKey of priorityDestinationPhotoKeys) {
    if (!curatedDestinationPhotos[destinationKey]) {
      throw new Error(
        `Priority destination ${destinationKey} must use a curated city-specific photo.`,
      );
    }
  }
}

// Keep destination images photographic and unique so discovery cards never collapse back to illustrations or shared fallback art.
assertPriorityDestinationPhotos();
assertPhotographicDestinationImages(destinationCatalog);
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
                    <DestinationCard
                      key={`${destination.region}-${destination.name}`}
                      href={getDestinationHref(destination)}
                      name={destination.name}
                      country={destination.country}
                      image={destination.image}
                      imageAlt={destination.imageAlt}
                      tag={destination.tag}
                      subtitle={destinationSubtitle}
                    />
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
