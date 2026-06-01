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
};

type Destination = DestinationSeed & {
  region: RegionName;
  image: string;
  imageAlt: string;
  tag: string;
};

type DestinationSection = {
  region: RegionName;
  accent: string;
  summary: string;
  destinations: Destination[];
};

const destinationPhotoUrls: Partial<Record<string, string>> = {
  London:
    "https://images.pexels.com/photos/33843218/pexels-photo-33843218.jpeg?auto=compress&cs=tinysrgb&w=1200",
  Paris:
    "https://images.pexels.com/photos/2082103/pexels-photo-2082103.jpeg?auto=compress&cs=tinysrgb&w=1200",
  Rome:
    "https://images.pexels.com/photos/1701595/pexels-photo-1701595.jpeg?auto=compress&cs=tinysrgb&w=1200",
  Barcelona:
    "https://images.pexels.com/photos/35759447/pexels-photo-35759447.jpeg?auto=compress&cs=tinysrgb&w=1200",
  Dubai:
    "https://images.pexels.com/photos/21765772/pexels-photo-21765772.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "New York":
    "https://images.pexels.com/photos/11182439/pexels-photo-11182439.jpeg?auto=compress&cs=tinysrgb&w=1200",
  Tokyo:
    "https://images.pexels.com/photos/31344755/pexels-photo-31344755.jpeg?auto=compress&cs=tinysrgb&w=1200",
};

const imageSearchHints: Partial<Record<string, string>> = {
  London: "London skyline Big Ben",
  Paris: "Eiffel Tower Paris cityscape",
  Rome: "Colosseum historic Rome",
  Barcelona: "Sagrada Familia Barcelona skyline",
  Dubai: "Burj Khalifa Dubai skyline",
  "New York": "Manhattan skyline New York",
  Tokyo: "Tokyo city lights skyline",
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
    { name: "London", country: "United Kingdom" },
    { name: "Paris", country: "France" },
    { name: "Rome", country: "Italy" },
    { name: "Barcelona", country: "Spain" },
    { name: "Amsterdam", country: "Netherlands" },
    { name: "Berlin", country: "Germany" },
    { name: "Madrid", country: "Spain" },
    { name: "Lisbon", country: "Portugal" },
    { name: "Prague", country: "Czechia" },
    { name: "Vienna", country: "Austria" },
    { name: "Athens", country: "Greece" },
    { name: "Dublin", country: "Ireland" },
    { name: "Copenhagen", country: "Denmark" },
    { name: "Stockholm", country: "Sweden" },
    { name: "Oslo", country: "Norway" },
    { name: "Budapest", country: "Hungary" },
    { name: "Florence", country: "Italy" },
    { name: "Venice", country: "Italy" },
    { name: "Edinburgh", country: "United Kingdom" },
    { name: "Reykjavik", country: "Iceland" },
  ],
  "North America": [
    { name: "New York", country: "United States" },
    { name: "Los Angeles", country: "United States" },
    { name: "Chicago", country: "United States" },
    { name: "Miami", country: "United States" },
    { name: "San Francisco", country: "United States" },
    { name: "Las Vegas", country: "United States" },
    { name: "Seattle", country: "United States" },
    { name: "Boston", country: "United States" },
    { name: "Washington", country: "United States" },
    { name: "Orlando", country: "United States" },
    { name: "Toronto", country: "Canada" },
    { name: "Vancouver", country: "Canada" },
    { name: "Montreal", country: "Canada" },
    { name: "Calgary", country: "Canada" },
    { name: "Quebec City", country: "Canada" },
    { name: "Mexico City", country: "Mexico" },
    { name: "Cancun", country: "Mexico" },
    { name: "Guadalajara", country: "Mexico" },
    { name: "Monterrey", country: "Mexico" },
    { name: "Tulum", country: "Mexico" },
  ],
  Asia: [
    { name: "Tokyo", country: "Japan" },
    { name: "Seoul", country: "South Korea" },
    { name: "Bangkok", country: "Thailand" },
    { name: "Singapore", country: "Singapore" },
    { name: "Hong Kong", country: "Hong Kong" },
    { name: "Kuala Lumpur", country: "Malaysia" },
    { name: "Bali", country: "Indonesia" },
    { name: "Jakarta", country: "Indonesia" },
    { name: "Hanoi", country: "Vietnam" },
    { name: "Ho Chi Minh City", country: "Vietnam" },
    { name: "Manila", country: "Philippines" },
    { name: "Taipei", country: "Taiwan" },
    { name: "Shanghai", country: "China" },
    { name: "Beijing", country: "China" },
    { name: "Mumbai", country: "India" },
    { name: "Delhi", country: "India" },
    { name: "Jaipur", country: "India" },
    { name: "Phuket", country: "Thailand" },
    { name: "Chiang Mai", country: "Thailand" },
    { name: "Kyoto", country: "Japan" },
  ],
  Africa: [
    { name: "Cape Town", country: "South Africa" },
    { name: "Johannesburg", country: "South Africa" },
    { name: "Nairobi", country: "Kenya" },
    { name: "Marrakech", country: "Morocco" },
    { name: "Casablanca", country: "Morocco" },
    { name: "Cairo", country: "Egypt" },
    { name: "Lagos", country: "Nigeria" },
    { name: "Abuja", country: "Nigeria" },
    { name: "Accra", country: "Ghana" },
    { name: "Dakar", country: "Senegal" },
    { name: "Addis Ababa", country: "Ethiopia" },
    { name: "Zanzibar", country: "Tanzania" },
    { name: "Kigali", country: "Rwanda" },
    { name: "Victoria Falls", country: "Zimbabwe" },
    { name: "Windhoek", country: "Namibia" },
    { name: "Gaborone", country: "Botswana" },
    { name: "Tunis", country: "Tunisia" },
    { name: "Algiers", country: "Algeria" },
    { name: "Mauritius", country: "Mauritius" },
    { name: "Seychelles", country: "Seychelles" },
  ],
  "Middle East": [
    { name: "Dubai", country: "United Arab Emirates" },
    { name: "Abu Dhabi", country: "United Arab Emirates" },
    { name: "Doha", country: "Qatar" },
    { name: "Riyadh", country: "Saudi Arabia" },
    { name: "Jeddah", country: "Saudi Arabia" },
    { name: "Muscat", country: "Oman" },
    { name: "Manama", country: "Bahrain" },
    { name: "Kuwait City", country: "Kuwait" },
    { name: "Amman", country: "Jordan" },
    { name: "Petra", country: "Jordan" },
    { name: "Beirut", country: "Lebanon" },
    { name: "Tel Aviv", country: "Israel" },
    { name: "Jerusalem", country: "Israel" },
    { name: "Istanbul", country: "Turkey" },
    { name: "Cappadocia", country: "Turkey" },
    { name: "Ankara", country: "Turkey" },
    { name: "Bodrum", country: "Turkey" },
    { name: "Antalya", country: "Turkey" },
    { name: "Salalah", country: "Oman" },
    { name: "AlUla", country: "Saudi Arabia" },
  ],
  "South America": [
    { name: "Buenos Aires", country: "Argentina" },
    { name: "Rio de Janeiro", country: "Brazil" },
    { name: "Sao Paulo", country: "Brazil" },
    { name: "Lima", country: "Peru" },
    { name: "Cusco", country: "Peru" },
    { name: "Santiago", country: "Chile" },
    { name: "Bogota", country: "Colombia" },
    { name: "Cartagena", country: "Colombia" },
    { name: "Medellin", country: "Colombia" },
    { name: "Quito", country: "Ecuador" },
    { name: "Galapagos Islands", country: "Ecuador" },
    { name: "Montevideo", country: "Uruguay" },
    { name: "Punta del Este", country: "Uruguay" },
    { name: "La Paz", country: "Bolivia" },
    { name: "Uyuni", country: "Bolivia" },
    { name: "Asuncion", country: "Paraguay" },
    { name: "Georgetown", country: "Guyana" },
    { name: "Mendoza", country: "Argentina" },
    { name: "Florianopolis", country: "Brazil" },
    { name: "Manaus", country: "Brazil" },
  ],
  Caribbean: [
    { name: "Nassau", country: "Bahamas" },
    { name: "Montego Bay", country: "Jamaica" },
    { name: "Kingston", country: "Jamaica" },
    { name: "Punta Cana", country: "Dominican Republic" },
    { name: "Santo Domingo", country: "Dominican Republic" },
    { name: "San Juan", country: "Puerto Rico" },
    { name: "Aruba", country: "Aruba" },
    { name: "Curacao", country: "Curacao" },
    { name: "Barbados", country: "Barbados" },
    { name: "St Lucia", country: "Saint Lucia" },
    { name: "Antigua", country: "Antigua and Barbuda" },
    { name: "St Kitts", country: "Saint Kitts and Nevis" },
    { name: "Grenada", country: "Grenada" },
    { name: "Trinidad", country: "Trinidad and Tobago" },
    { name: "Tobago", country: "Trinidad and Tobago" },
    { name: "Grand Cayman", country: "Cayman Islands" },
    { name: "Turks and Caicos", country: "Turks and Caicos Islands" },
    { name: "St Martin", country: "Saint Martin" },
    { name: "Havana", country: "Cuba" },
    { name: "Varadero", country: "Cuba" },
  ],
  Oceania: [
    { name: "Sydney", country: "Australia" },
    { name: "Melbourne", country: "Australia" },
    { name: "Brisbane", country: "Australia" },
    { name: "Perth", country: "Australia" },
    { name: "Adelaide", country: "Australia" },
    { name: "Gold Coast", country: "Australia" },
    { name: "Cairns", country: "Australia" },
    { name: "Hobart", country: "Australia" },
    { name: "Auckland", country: "New Zealand" },
    { name: "Wellington", country: "New Zealand" },
    { name: "Queenstown", country: "New Zealand" },
    { name: "Christchurch", country: "New Zealand" },
    { name: "Rotorua", country: "New Zealand" },
    { name: "Fiji", country: "Fiji" },
    { name: "Nadi", country: "Fiji" },
    { name: "Tahiti", country: "French Polynesia" },
    { name: "Bora Bora", country: "French Polynesia" },
    { name: "Port Vila", country: "Vanuatu" },
    { name: "Apia", country: "Samoa" },
    { name: "Noumea", country: "New Caledonia" },
  ],
};

function getDestinationImageUrl(destination: DestinationSeed) {
  const curatedPhotoUrl = destinationPhotoUrls[destination.name];

  if (curatedPhotoUrl) {
    return curatedPhotoUrl;
  }

  const query =
    imageSearchHints[destination.name] ??
    `${destination.name} ${destination.country} landmark travel`;

  return `https://source.unsplash.com/900x650/?${encodeURIComponent(query)}`;
}

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
      image: getDestinationImageUrl(destination),
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
