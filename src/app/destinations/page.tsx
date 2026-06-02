import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { DestinationCard } from "./DestinationCard";

type RegionName =
  | "Europe"
  | "North America"
  | "Asia"
  | "Africa"
  | "Middle East";

type DestinationSeed = {
  name: string;
  country: string;
  image: string;
  imagePosition?: string;
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
    "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Paris|France":
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Dubai|United Arab Emirates":
    "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "New York|United States":
    "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Rome|Italy":
    "https://images.unsplash.com/photo-1525874684015-58379d421a52?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Barcelona|Spain":
    "https://images.unsplash.com/photo-1583422409516-2895a77efded?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Amsterdam|Netherlands":
    "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Tokyo|Japan":
    "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Singapore|Singapore":
    "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Bangkok|Thailand":
    "https://images.unsplash.com/photo-1508009603885-50cf7c579365?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Cape Town|South Africa":
    "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Istanbul|Turkey":
    "https://images.unsplash.com/photo-1527838832700-5059252407fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Las Vegas|United States":
    "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Toronto|Canada":
    "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Los Angeles|United States":
    "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Miami|United States":
    "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Doha|Qatar":
    "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Abu Dhabi|United Arab Emirates":
    "https://images.unsplash.com/photo-1518684079-3c830dcef090?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Lisbon|Portugal":
    "https://images.unsplash.com/photo-1501927023255-9063be98970c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Prague|Czechia":
    "https://images.unsplash.com/photo-1541849546-216549ae216d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Athens|Greece":
    "https://images.unsplash.com/photo-1555993539-1732b0258235?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Marrakech|Morocco":
    "https://images.pexels.com/photos/31356131/pexels-photo-31356131.jpeg?auto=compress&cs=tinysrgb&w=1800",
  "Nairobi|Kenya":
    "https://images.unsplash.com/photo-1523805009345-7448845a9e53?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Kuala Lumpur|Malaysia":
    "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Venice|Italy":
    "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Florence|Italy":
    "https://images.unsplash.com/photo-1543429257-3eb0b65d9c58?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Berlin|Germany":
    "https://images.unsplash.com/photo-1560969184-10fe8719e047?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Madrid|Spain":
    "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Copenhagen|Denmark":
    "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Zurich|Switzerland":
    "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Vienna|Austria":
    "https://images.unsplash.com/photo-1516550893923-42d28e5677af?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Milan|Italy":
    "https://images.unsplash.com/photo-1520440229-6469a149ac59?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Accra|Ghana":
    "https://images.pexels.com/photos/31781975/pexels-photo-31781975.jpeg?auto=compress&cs=tinysrgb&w=1800",
  "Lagos|Nigeria":
    "https://images.pexels.com/photos/32014864/pexels-photo-32014864.jpeg?auto=compress&cs=tinysrgb&w=1800",
  "Abuja|Nigeria":
    "https://images.pexels.com/photos/20453360/pexels-photo-20453360.jpeg?auto=compress&cs=tinysrgb&w=1800",
  "Muscat|Oman":
    "https://images.pexels.com/photos/30798979/pexels-photo-30798979.jpeg?auto=compress&cs=tinysrgb&w=1800",
  "Jeddah|Saudi Arabia":
    "https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Vancouver|Canada":
    "https://images.unsplash.com/photo-1578922746465-3a80a228f223?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Chicago|United States":
    "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "San Francisco|United States":
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Seoul|South Korea":
    "https://images.pexels.com/photos/32196432/pexels-photo-32196432.jpeg?auto=compress&cs=tinysrgb&w=1800",
  "Osaka|Japan":
    "https://images.unsplash.com/photo-1590559899731-a382839e5549?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Bali|Indonesia":
    "https://images.unsplash.com/photo-1537996194471-e657df975ab4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
  "Phuket|Thailand":
    "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95",
};

function getDestinationPhotoUrl(name: string, country: string) {
  const image = curatedDestinationPhotos[`${name}|${country}`];

  if (!image) {
    throw new Error(
      `Destination ${name}, ${country} must have a curated city-specific photo.`,
    );
  }

  return image;
}

const destinationTags = [
  "iconic skyline",
  "landmark escape",
  "culture capital",
  "golden-hour views",
  "coastal energy",
  "food market nights",
  "historic streets",
  "design weekend",
] as const;

const destinationSubtitle = "Bright views, flights, hotels, and deals";

const regionDetails: Record<
  RegionName,
  Pick<DestinationSection, "accent" | "summary">
> = {
  Europe: {
    accent: "from-blue-600 to-violet-600",
    summary:
      "A focused edit of landmark cities, romantic canals, design capitals, and timeless food-and-culture weekends.",
  },
  "North America": {
    accent: "from-sky-600 to-indigo-700",
    summary:
      "Statement skylines, coastal icons, entertainment capitals, and cinematic city breaks worth planning around.",
  },
  Asia: {
    accent: "from-rose-500 to-violet-700",
    summary:
      "Neon cityscapes, island escapes, street-food legends, temples, beaches, and premium shopping gateways.",
  },
  Africa: {
    accent: "from-emerald-600 to-violet-600",
    summary:
      "High-impact travel favorites with ocean scenery, safari access, creative capitals, and rich cultural texture.",
  },
  "Middle East": {
    accent: "from-amber-500 to-fuchsia-600",
    summary:
      "Luxury skylines, warm coasts, desert drama, heritage districts, and modern hospitality hubs.",
  },
};

const destinationCatalog: Record<RegionName, DestinationSeed[]> = {
  Europe: [
    {
      name: "London",
      country: "United Kingdom",
      image: getDestinationPhotoUrl("London", "United Kingdom"),
      imagePosition: "center 42%",
    },
    {
      name: "Paris",
      country: "France",
      image: getDestinationPhotoUrl("Paris", "France"),
      imagePosition: "center 45%",
    },
    {
      name: "Rome",
      country: "Italy",
      image: getDestinationPhotoUrl("Rome", "Italy"),
      imagePosition: "center 45%",
    },
    {
      name: "Barcelona",
      country: "Spain",
      image: getDestinationPhotoUrl("Barcelona", "Spain"),
      imagePosition: "center 50%",
    },
    {
      name: "Amsterdam",
      country: "Netherlands",
      image: getDestinationPhotoUrl("Amsterdam", "Netherlands"),
      imagePosition: "center 48%",
    },
    {
      name: "Lisbon",
      country: "Portugal",
      image: getDestinationPhotoUrl("Lisbon", "Portugal"),
      imagePosition: "center 52%",
    },
    {
      name: "Prague",
      country: "Czechia",
      image: getDestinationPhotoUrl("Prague", "Czechia"),
      imagePosition: "center 48%",
    },
    {
      name: "Athens",
      country: "Greece",
      image: getDestinationPhotoUrl("Athens", "Greece"),
      imagePosition: "center 50%",
    },
    {
      name: "Venice",
      country: "Italy",
      image: getDestinationPhotoUrl("Venice", "Italy"),
      imagePosition: "center 50%",
    },
    {
      name: "Florence",
      country: "Italy",
      image: getDestinationPhotoUrl("Florence", "Italy"),
      imagePosition: "center 50%",
    },
    {
      name: "Berlin",
      country: "Germany",
      image: getDestinationPhotoUrl("Berlin", "Germany"),
      imagePosition: "center 46%",
    },
    {
      name: "Madrid",
      country: "Spain",
      image: getDestinationPhotoUrl("Madrid", "Spain"),
      imagePosition: "center 48%",
    },
    {
      name: "Copenhagen",
      country: "Denmark",
      image: getDestinationPhotoUrl("Copenhagen", "Denmark"),
      imagePosition: "center 52%",
    },
    {
      name: "Zurich",
      country: "Switzerland",
      image: getDestinationPhotoUrl("Zurich", "Switzerland"),
      imagePosition: "center 50%",
    },
    {
      name: "Vienna",
      country: "Austria",
      image: getDestinationPhotoUrl("Vienna", "Austria"),
      imagePosition: "center 48%",
    },
    {
      name: "Milan",
      country: "Italy",
      image: getDestinationPhotoUrl("Milan", "Italy"),
      imagePosition: "center 48%",
    },
  ],
  "North America": [
    {
      name: "New York",
      country: "United States",
      image: getDestinationPhotoUrl("New York", "United States"),
      imagePosition: "center 40%",
    },
    {
      name: "Las Vegas",
      country: "United States",
      image: getDestinationPhotoUrl("Las Vegas", "United States"),
      imagePosition: "center 48%",
    },
    {
      name: "Toronto",
      country: "Canada",
      image: getDestinationPhotoUrl("Toronto", "Canada"),
      imagePosition: "center 44%",
    },
    {
      name: "Los Angeles",
      country: "United States",
      image: getDestinationPhotoUrl("Los Angeles", "United States"),
      imagePosition: "center 50%",
    },
    {
      name: "Miami",
      country: "United States",
      image: getDestinationPhotoUrl("Miami", "United States"),
      imagePosition: "center 58%",
    },
    {
      name: "Vancouver",
      country: "Canada",
      image: getDestinationPhotoUrl("Vancouver", "Canada"),
      imagePosition: "center 44%",
    },
    {
      name: "Chicago",
      country: "United States",
      image: getDestinationPhotoUrl("Chicago", "United States"),
      imagePosition: "center 43%",
    },
    {
      name: "San Francisco",
      country: "United States",
      image: getDestinationPhotoUrl("San Francisco", "United States"),
      imagePosition: "center 46%",
    },
  ],
  Asia: [
    {
      name: "Tokyo",
      country: "Japan",
      image: getDestinationPhotoUrl("Tokyo", "Japan"),
      imagePosition: "center 45%",
    },
    {
      name: "Singapore",
      country: "Singapore",
      image: getDestinationPhotoUrl("Singapore", "Singapore"),
      imagePosition: "center 42%",
    },
    {
      name: "Bangkok",
      country: "Thailand",
      image: getDestinationPhotoUrl("Bangkok", "Thailand"),
      imagePosition: "center 55%",
    },
    {
      name: "Kuala Lumpur",
      country: "Malaysia",
      image: getDestinationPhotoUrl("Kuala Lumpur", "Malaysia"),
      imagePosition: "center 42%",
    },
    {
      name: "Seoul",
      country: "South Korea",
      image: getDestinationPhotoUrl("Seoul", "South Korea"),
      imagePosition: "center 45%",
    },
    {
      name: "Osaka",
      country: "Japan",
      image: getDestinationPhotoUrl("Osaka", "Japan"),
      imagePosition: "center 50%",
    },
    {
      name: "Bali",
      country: "Indonesia",
      image: getDestinationPhotoUrl("Bali", "Indonesia"),
      imagePosition: "center 58%",
    },
    {
      name: "Phuket",
      country: "Thailand",
      image: getDestinationPhotoUrl("Phuket", "Thailand"),
      imagePosition: "center 56%",
    },
  ],
  Africa: [
    {
      name: "Cape Town",
      country: "South Africa",
      image: getDestinationPhotoUrl("Cape Town", "South Africa"),
      imagePosition: "center 45%",
    },
    {
      name: "Marrakech",
      country: "Morocco",
      image: getDestinationPhotoUrl("Marrakech", "Morocco"),
      imagePosition: "center 54%",
    },
    {
      name: "Nairobi",
      country: "Kenya",
      image: getDestinationPhotoUrl("Nairobi", "Kenya"),
      imagePosition: "center 52%",
    },
    {
      name: "Accra",
      country: "Ghana",
      image: getDestinationPhotoUrl("Accra", "Ghana"),
      imagePosition: "center 52%",
    },
    {
      name: "Lagos",
      country: "Nigeria",
      image: getDestinationPhotoUrl("Lagos", "Nigeria"),
      imagePosition: "center 52%",
    },
    {
      name: "Abuja",
      country: "Nigeria",
      image: getDestinationPhotoUrl("Abuja", "Nigeria"),
      imagePosition: "center 48%",
    },
  ],
  "Middle East": [
    {
      name: "Dubai",
      country: "United Arab Emirates",
      image: getDestinationPhotoUrl("Dubai", "United Arab Emirates"),
      imagePosition: "center 44%",
    },
    {
      name: "Istanbul",
      country: "Turkey",
      image: getDestinationPhotoUrl("Istanbul", "Turkey"),
      imagePosition: "center 48%",
    },
    {
      name: "Doha",
      country: "Qatar",
      image: getDestinationPhotoUrl("Doha", "Qatar"),
      imagePosition: "center 45%",
    },
    {
      name: "Abu Dhabi",
      country: "United Arab Emirates",
      image: getDestinationPhotoUrl("Abu Dhabi", "United Arab Emirates"),
      imagePosition: "center 45%",
    },
    {
      name: "Muscat",
      country: "Oman",
      image: getDestinationPhotoUrl("Muscat", "Oman"),
      imagePosition: "center 50%",
    },
    {
      name: "Jeddah",
      country: "Saudi Arabia",
      image: getDestinationPhotoUrl("Jeddah", "Saudi Arabia"),
      imagePosition: "center 50%",
    },
  ],
};

const photographicImageSourcePatterns = [
  /^https:\/\/images\.unsplash\.com\/photo-[A-Za-z0-9_-]+\?.+$/,
  /^https:\/\/images\.pexels\.com\/photos\/\d+\/pexels-photo-\d+\.jpeg\?.+$/,
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
          `Destination image for ${destination.name} must be a curated photographic image URL, not a prompt, search phrase, SVG, generated illustration, or placeholder fallback.`,
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

function assertCuratedDestinationCount(
  catalog: Record<RegionName, DestinationSeed[]>,
) {
  const destinationCount = Object.values(catalog).reduce(
    (count, destinations) => count + destinations.length,
    0,
  );

  if (destinationCount < 40 || destinationCount > 50) {
    throw new Error(
      `Curated destinations should stay between 40 and 50 places; found ${destinationCount}.`,
    );
  }
}

// Keep destination images photographic, unique, and tightly curated so discovery cards never collapse back to generic database results.
assertCuratedDestinationCount(destinationCatalog);
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
        <section className="relative isolate overflow-hidden border-b border-violet-200 bg-[radial-gradient(circle_at_50%_100%,rgba(251,191,36,0.30),transparent_32%),linear-gradient(180deg,#111036_0%,#3b1578_48%,#7c3aed_100%)] text-white">
          <div className="absolute inset-0 -z-10 opacity-25 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.42)_1px,transparent_1.6px)] [background-size:28px_28px]" />
          <div className="absolute -left-20 top-12 -z-10 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="absolute -right-16 bottom-2 -z-10 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" />
          <svg
            aria-hidden="true"
            className="absolute right-0 top-6 -z-10 hidden h-56 w-[42rem] text-white/25 sm:block"
            fill="none"
            viewBox="0 0 672 224"
          >
            <path
              d="M13 154C111 65 207 210 318 112C428 15 535 47 659 80"
              stroke="currentColor"
              strokeDasharray="10 14"
              strokeLinecap="round"
              strokeWidth="2"
            />
            <path d="m597 60 46 18-44 20 10-20-12-18Z" fill="currentColor" />
          </svg>
          <svg
            aria-hidden="true"
            className="absolute bottom-4 left-1/2 -z-10 h-32 w-[34rem] -translate-x-1/2 text-white/10"
            fill="none"
            viewBox="0 0 544 128"
          >
            <path
              d="M32 64c40-34 72-34 112 0s72 34 112 0 72-34 112 0 72 34 144 0"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
            />
            <path
              d="M96 28c50 24 102 24 156 0M292 100c46-22 92-22 138 0"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.5"
            />
          </svg>

          <div className="page-shell relative py-7 sm:py-9 lg:py-10">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-violet-50 shadow-sm shadow-black/10 backdrop-blur">
                Destination discovery
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white drop-shadow-sm sm:text-5xl lg:text-6xl">
                Where do you want to go next?
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-violet-50/90 sm:text-lg">
                Browse brighter, hand-picked city views, compare flights, and
                find travel deals in minutes.
              </p>
            </div>

            <nav
              aria-label="Destination regions"
              className="mt-6 flex gap-2 overflow-x-auto border-t border-white/15 pt-4"
            >
              {destinationSections.map((section, sectionIndex) => {
                const isActive = sectionIndex === 0;

                return (
                  <a
                    key={section.region}
                    href={`#${getRegionId(section.region)}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black shadow-sm backdrop-blur transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/25 ${
                      isActive
                        ? "border-white bg-white text-violet-800 shadow-black/10 hover:bg-violet-50"
                        : "border-white/25 bg-white/10 text-white hover:border-white/45 hover:bg-white/18"
                    }`}
                  >
                    {section.region}
                  </a>
                );
              })}
            </nav>
          </div>
        </section>

        <section className="page-shell py-5 sm:py-6 lg:py-8">
          <div className="space-y-12">
            {destinationSections.map((section) => (
              <section
                key={section.region}
                id={getRegionId(section.region)}
                className="scroll-mt-24"
              >
                <div className="mb-5 max-w-3xl">
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {section.destinations.map((destination) => (
                    <DestinationCard
                      key={`${destination.region}-${destination.name}`}
                      href={getDestinationHref(destination)}
                      name={destination.name}
                      country={destination.country}
                      image={destination.image}
                      imageAlt={destination.imageAlt}
                      imagePosition={destination.imagePosition}
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
