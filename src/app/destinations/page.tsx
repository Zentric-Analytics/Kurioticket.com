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

const destinationPhotoUrls = {
  London:
    "https://images.pexels.com/photos/33843218/pexels-photo-33843218.jpeg?auto=compress&cs=tinysrgb&w=1200",
  Paris:
    "https://images.pexels.com/photos/2082103/pexels-photo-2082103.jpeg?auto=compress&cs=tinysrgb&w=1200",
  Rome: "https://images.pexels.com/photos/1701595/pexels-photo-1701595.jpeg?auto=compress&cs=tinysrgb&w=1200",
  Barcelona:
    "https://images.pexels.com/photos/35759447/pexels-photo-35759447.jpeg?auto=compress&cs=tinysrgb&w=1200",
  Dubai:
    "https://images.pexels.com/photos/21765772/pexels-photo-21765772.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "New York":
    "https://images.pexels.com/photos/11182439/pexels-photo-11182439.jpeg?auto=compress&cs=tinysrgb&w=1200",
  Tokyo:
    "https://images.pexels.com/photos/31344755/pexels-photo-31344755.jpeg?auto=compress&cs=tinysrgb&w=1200",
} as const;

const regionalDestinationImages: Record<RegionName, string> = {
  Europe:
    "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "North America":
    "https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg?auto=compress&cs=tinysrgb&w=1200",
  Asia: "https://images.pexels.com/photos/2187605/pexels-photo-2187605.jpeg?auto=compress&cs=tinysrgb&w=1200",
  Africa:
    "https://images.pexels.com/photos/259447/pexels-photo-259447.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "Middle East":
    "https://images.pexels.com/photos/3787839/pexels-photo-3787839.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "South America":
    "https://images.pexels.com/photos/2868242/pexels-photo-2868242.jpeg?auto=compress&cs=tinysrgb&w=1200",
  Caribbean:
    "https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg?auto=compress&cs=tinysrgb&w=1200",
  Oceania:
    "https://images.pexels.com/photos/1878293/pexels-photo-1878293.jpeg?auto=compress&cs=tinysrgb&w=1200",
};

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
      image: destinationPhotoUrls.London,
    },
    { name: "Paris", country: "France", image: destinationPhotoUrls.Paris },
    { name: "Rome", country: "Italy", image: destinationPhotoUrls.Rome },
    {
      name: "Barcelona",
      country: "Spain",
      image: destinationPhotoUrls.Barcelona,
    },
    {
      name: "Amsterdam",
      country: "Netherlands",
      image: regionalDestinationImages["Europe"],
    },
    {
      name: "Berlin",
      country: "Germany",
      image: regionalDestinationImages["Europe"],
    },
    {
      name: "Madrid",
      country: "Spain",
      image: regionalDestinationImages["Europe"],
    },
    {
      name: "Lisbon",
      country: "Portugal",
      image: regionalDestinationImages["Europe"],
    },
    {
      name: "Prague",
      country: "Czechia",
      image: regionalDestinationImages["Europe"],
    },
    {
      name: "Vienna",
      country: "Austria",
      image: regionalDestinationImages["Europe"],
    },
    {
      name: "Athens",
      country: "Greece",
      image: regionalDestinationImages["Europe"],
    },
    {
      name: "Dublin",
      country: "Ireland",
      image: regionalDestinationImages["Europe"],
    },
    {
      name: "Copenhagen",
      country: "Denmark",
      image: regionalDestinationImages["Europe"],
    },
    {
      name: "Stockholm",
      country: "Sweden",
      image: regionalDestinationImages["Europe"],
    },
    {
      name: "Oslo",
      country: "Norway",
      image: regionalDestinationImages["Europe"],
    },
    {
      name: "Budapest",
      country: "Hungary",
      image: regionalDestinationImages["Europe"],
    },
    {
      name: "Florence",
      country: "Italy",
      image: regionalDestinationImages["Europe"],
    },
    {
      name: "Venice",
      country: "Italy",
      image: regionalDestinationImages["Europe"],
    },
    {
      name: "Edinburgh",
      country: "United Kingdom",
      image: regionalDestinationImages["Europe"],
    },
    {
      name: "Reykjavik",
      country: "Iceland",
      image: regionalDestinationImages["Europe"],
    },
  ],
  "North America": [
    {
      name: "New York",
      country: "United States",
      image: destinationPhotoUrls["New York"],
    },
    {
      name: "Los Angeles",
      country: "United States",
      image: regionalDestinationImages["North America"],
    },
    {
      name: "Chicago",
      country: "United States",
      image: regionalDestinationImages["North America"],
    },
    {
      name: "Miami",
      country: "United States",
      image: regionalDestinationImages["North America"],
    },
    {
      name: "San Francisco",
      country: "United States",
      image: regionalDestinationImages["North America"],
    },
    {
      name: "Las Vegas",
      country: "United States",
      image: regionalDestinationImages["North America"],
    },
    {
      name: "Seattle",
      country: "United States",
      image: regionalDestinationImages["North America"],
    },
    {
      name: "Boston",
      country: "United States",
      image: regionalDestinationImages["North America"],
    },
    {
      name: "Washington",
      country: "United States",
      image: regionalDestinationImages["North America"],
    },
    {
      name: "Orlando",
      country: "United States",
      image: regionalDestinationImages["North America"],
    },
    {
      name: "Toronto",
      country: "Canada",
      image: regionalDestinationImages["North America"],
    },
    {
      name: "Vancouver",
      country: "Canada",
      image: regionalDestinationImages["North America"],
    },
    {
      name: "Montreal",
      country: "Canada",
      image: regionalDestinationImages["North America"],
    },
    {
      name: "Calgary",
      country: "Canada",
      image: regionalDestinationImages["North America"],
    },
    {
      name: "Quebec City",
      country: "Canada",
      image: regionalDestinationImages["North America"],
    },
    {
      name: "Mexico City",
      country: "Mexico",
      image: regionalDestinationImages["North America"],
    },
    {
      name: "Cancun",
      country: "Mexico",
      image: regionalDestinationImages["North America"],
    },
    {
      name: "Guadalajara",
      country: "Mexico",
      image: regionalDestinationImages["North America"],
    },
    {
      name: "Monterrey",
      country: "Mexico",
      image: regionalDestinationImages["North America"],
    },
    {
      name: "Tulum",
      country: "Mexico",
      image: regionalDestinationImages["North America"],
    },
  ],
  Asia: [
    { name: "Tokyo", country: "Japan", image: destinationPhotoUrls.Tokyo },
    {
      name: "Seoul",
      country: "South Korea",
      image: regionalDestinationImages["Asia"],
    },
    {
      name: "Bangkok",
      country: "Thailand",
      image: regionalDestinationImages["Asia"],
    },
    {
      name: "Singapore",
      country: "Singapore",
      image: regionalDestinationImages["Asia"],
    },
    {
      name: "Hong Kong",
      country: "Hong Kong",
      image: regionalDestinationImages["Asia"],
    },
    {
      name: "Kuala Lumpur",
      country: "Malaysia",
      image: regionalDestinationImages["Asia"],
    },
    {
      name: "Bali",
      country: "Indonesia",
      image: regionalDestinationImages["Asia"],
    },
    {
      name: "Jakarta",
      country: "Indonesia",
      image: regionalDestinationImages["Asia"],
    },
    {
      name: "Hanoi",
      country: "Vietnam",
      image: regionalDestinationImages["Asia"],
    },
    {
      name: "Ho Chi Minh City",
      country: "Vietnam",
      image: regionalDestinationImages["Asia"],
    },
    {
      name: "Manila",
      country: "Philippines",
      image: regionalDestinationImages["Asia"],
    },
    {
      name: "Taipei",
      country: "Taiwan",
      image: regionalDestinationImages["Asia"],
    },
    {
      name: "Shanghai",
      country: "China",
      image: regionalDestinationImages["Asia"],
    },
    {
      name: "Beijing",
      country: "China",
      image: regionalDestinationImages["Asia"],
    },
    {
      name: "Mumbai",
      country: "India",
      image: regionalDestinationImages["Asia"],
    },
    {
      name: "Delhi",
      country: "India",
      image: regionalDestinationImages["Asia"],
    },
    {
      name: "Jaipur",
      country: "India",
      image: regionalDestinationImages["Asia"],
    },
    {
      name: "Phuket",
      country: "Thailand",
      image: regionalDestinationImages["Asia"],
    },
    {
      name: "Chiang Mai",
      country: "Thailand",
      image: regionalDestinationImages["Asia"],
    },
    {
      name: "Kyoto",
      country: "Japan",
      image: regionalDestinationImages["Asia"],
    },
  ],
  Africa: [
    {
      name: "Cape Town",
      country: "South Africa",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Johannesburg",
      country: "South Africa",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Nairobi",
      country: "Kenya",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Marrakech",
      country: "Morocco",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Casablanca",
      country: "Morocco",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Cairo",
      country: "Egypt",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Lagos",
      country: "Nigeria",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Abuja",
      country: "Nigeria",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Accra",
      country: "Ghana",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Dakar",
      country: "Senegal",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Addis Ababa",
      country: "Ethiopia",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Zanzibar",
      country: "Tanzania",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Kigali",
      country: "Rwanda",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Victoria Falls",
      country: "Zimbabwe",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Windhoek",
      country: "Namibia",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Gaborone",
      country: "Botswana",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Tunis",
      country: "Tunisia",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Algiers",
      country: "Algeria",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Mauritius",
      country: "Mauritius",
      image: regionalDestinationImages["Africa"],
    },
    {
      name: "Seychelles",
      country: "Seychelles",
      image: regionalDestinationImages["Africa"],
    },
  ],
  "Middle East": [
    {
      name: "Dubai",
      country: "United Arab Emirates",
      image: destinationPhotoUrls.Dubai,
    },
    {
      name: "Abu Dhabi",
      country: "United Arab Emirates",
      image: regionalDestinationImages["Middle East"],
    },
    {
      name: "Doha",
      country: "Qatar",
      image: regionalDestinationImages["Middle East"],
    },
    {
      name: "Riyadh",
      country: "Saudi Arabia",
      image: regionalDestinationImages["Middle East"],
    },
    {
      name: "Jeddah",
      country: "Saudi Arabia",
      image: regionalDestinationImages["Middle East"],
    },
    {
      name: "Muscat",
      country: "Oman",
      image: regionalDestinationImages["Middle East"],
    },
    {
      name: "Manama",
      country: "Bahrain",
      image: regionalDestinationImages["Middle East"],
    },
    {
      name: "Kuwait City",
      country: "Kuwait",
      image: regionalDestinationImages["Middle East"],
    },
    {
      name: "Amman",
      country: "Jordan",
      image: regionalDestinationImages["Middle East"],
    },
    {
      name: "Petra",
      country: "Jordan",
      image: regionalDestinationImages["Middle East"],
    },
    {
      name: "Beirut",
      country: "Lebanon",
      image: regionalDestinationImages["Middle East"],
    },
    {
      name: "Tel Aviv",
      country: "Israel",
      image: regionalDestinationImages["Middle East"],
    },
    {
      name: "Jerusalem",
      country: "Israel",
      image: regionalDestinationImages["Middle East"],
    },
    {
      name: "Istanbul",
      country: "Turkey",
      image: regionalDestinationImages["Middle East"],
    },
    {
      name: "Cappadocia",
      country: "Turkey",
      image: regionalDestinationImages["Middle East"],
    },
    {
      name: "Ankara",
      country: "Turkey",
      image: regionalDestinationImages["Middle East"],
    },
    {
      name: "Bodrum",
      country: "Turkey",
      image: regionalDestinationImages["Middle East"],
    },
    {
      name: "Antalya",
      country: "Turkey",
      image: regionalDestinationImages["Middle East"],
    },
    {
      name: "Salalah",
      country: "Oman",
      image: regionalDestinationImages["Middle East"],
    },
    {
      name: "AlUla",
      country: "Saudi Arabia",
      image: regionalDestinationImages["Middle East"],
    },
  ],
  "South America": [
    {
      name: "Buenos Aires",
      country: "Argentina",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "Rio de Janeiro",
      country: "Brazil",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "Sao Paulo",
      country: "Brazil",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "Lima",
      country: "Peru",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "Cusco",
      country: "Peru",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "Santiago",
      country: "Chile",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "Bogota",
      country: "Colombia",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "Cartagena",
      country: "Colombia",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "Medellin",
      country: "Colombia",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "Quito",
      country: "Ecuador",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "Galapagos Islands",
      country: "Ecuador",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "Montevideo",
      country: "Uruguay",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "Punta del Este",
      country: "Uruguay",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "La Paz",
      country: "Bolivia",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "Uyuni",
      country: "Bolivia",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "Asuncion",
      country: "Paraguay",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "Georgetown",
      country: "Guyana",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "Mendoza",
      country: "Argentina",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "Florianopolis",
      country: "Brazil",
      image: regionalDestinationImages["South America"],
    },
    {
      name: "Manaus",
      country: "Brazil",
      image: regionalDestinationImages["South America"],
    },
  ],
  Caribbean: [
    {
      name: "Nassau",
      country: "Bahamas",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "Montego Bay",
      country: "Jamaica",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "Kingston",
      country: "Jamaica",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "Punta Cana",
      country: "Dominican Republic",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "Santo Domingo",
      country: "Dominican Republic",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "San Juan",
      country: "Puerto Rico",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "Aruba",
      country: "Aruba",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "Curacao",
      country: "Curacao",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "Barbados",
      country: "Barbados",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "St Lucia",
      country: "Saint Lucia",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "Antigua",
      country: "Antigua and Barbuda",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "St Kitts",
      country: "Saint Kitts and Nevis",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "Grenada",
      country: "Grenada",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "Trinidad",
      country: "Trinidad and Tobago",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "Tobago",
      country: "Trinidad and Tobago",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "Grand Cayman",
      country: "Cayman Islands",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "Turks and Caicos",
      country: "Turks and Caicos Islands",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "St Martin",
      country: "Saint Martin",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "Havana",
      country: "Cuba",
      image: regionalDestinationImages["Caribbean"],
    },
    {
      name: "Varadero",
      country: "Cuba",
      image: regionalDestinationImages["Caribbean"],
    },
  ],
  Oceania: [
    {
      name: "Sydney",
      country: "Australia",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Melbourne",
      country: "Australia",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Brisbane",
      country: "Australia",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Perth",
      country: "Australia",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Adelaide",
      country: "Australia",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Gold Coast",
      country: "Australia",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Cairns",
      country: "Australia",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Hobart",
      country: "Australia",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Auckland",
      country: "New Zealand",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Wellington",
      country: "New Zealand",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Queenstown",
      country: "New Zealand",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Christchurch",
      country: "New Zealand",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Rotorua",
      country: "New Zealand",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Fiji",
      country: "Fiji",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Nadi",
      country: "Fiji",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Tahiti",
      country: "French Polynesia",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Bora Bora",
      country: "French Polynesia",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Port Vila",
      country: "Vanuatu",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Apia",
      country: "Samoa",
      image: regionalDestinationImages["Oceania"],
    },
    {
      name: "Noumea",
      country: "New Caledonia",
      image: regionalDestinationImages["Oceania"],
    },
  ],
};

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
