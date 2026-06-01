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
    "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Paris|France":
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Dubai|United Arab Emirates":
    "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "New York|United States":
    "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Rome|Italy":
    "https://images.unsplash.com/photo-1525874684015-58379d421a52?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Barcelona|Spain":
    "https://images.unsplash.com/photo-1583422409516-2895a77efded?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Amsterdam|Netherlands":
    "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Tokyo|Japan":
    "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Singapore|Singapore":
    "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Bangkok|Thailand":
    "https://images.unsplash.com/photo-1508009603885-50cf7c579365?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Cape Town|South Africa":
    "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Istanbul|Turkey":
    "https://images.unsplash.com/photo-1527838832700-5059252407fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Las Vegas|United States":
    "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Toronto|Canada":
    "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Los Angeles|United States":
    "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Miami|United States":
    "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Doha|Qatar":
    "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Abu Dhabi|United Arab Emirates":
    "https://images.unsplash.com/photo-1518684079-3c830dcef090?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Lisbon|Portugal":
    "https://images.unsplash.com/photo-1501927023255-9063be98970c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Prague|Czechia":
    "https://images.unsplash.com/photo-1541849546-216549ae216d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Athens|Greece":
    "https://images.unsplash.com/photo-1555993539-1732b0258235?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Marrakech|Morocco":
    "https://images.unsplash.com/photo-1597212720158-0a65b7ab7434?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Nairobi|Kenya":
    "https://images.unsplash.com/photo-1523805009345-7448845a9e53?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Kuala Lumpur|Malaysia":
    "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Venice|Italy":
    "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Florence|Italy":
    "https://images.unsplash.com/photo-1543429257-3eb0b65d9c58?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Berlin|Germany":
    "https://images.unsplash.com/photo-1560969184-10fe8719e047?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Madrid|Spain":
    "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Copenhagen|Denmark":
    "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Zurich|Switzerland":
    "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Vienna|Austria":
    "https://images.unsplash.com/photo-1516550893923-42d28e5677af?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Milan|Italy":
    "https://images.unsplash.com/photo-1520440229-6469a149ac59?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Accra|Ghana":
    "https://images.unsplash.com/photo-1553901753-215db3446770?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Lagos|Nigeria":
    "https://images.pexels.com/photos/32014864/pexels-photo-32014864.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "Abuja|Nigeria":
    "https://images.pexels.com/photos/20453360/pexels-photo-20453360.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "Muscat|Oman":
    "https://images.unsplash.com/photo-1582647509711-c8aa8bdc5a09?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Jeddah|Saudi Arabia":
    "https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Vancouver|Canada":
    "https://images.unsplash.com/photo-1578922746465-3a80a228f223?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Chicago|United States":
    "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "San Francisco|United States":
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Seoul|South Korea":
    "https://images.unsplash.com/photo-1538485399081-7c8ed0e8fabb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Osaka|Japan":
    "https://images.unsplash.com/photo-1590559899731-a382839e5549?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Bali|Indonesia":
    "https://images.unsplash.com/photo-1537996194471-e657df975ab4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
  "Phuket|Thailand":
    "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
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

const destinationSubtitle = "Explore flights, hotels, and travel deals";

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
      name: "Athens",
      country: "Greece",
      image: getDestinationPhotoUrl("Athens", "Greece"),
    },
    {
      name: "Venice",
      country: "Italy",
      image: getDestinationPhotoUrl("Venice", "Italy"),
    },
    {
      name: "Florence",
      country: "Italy",
      image: getDestinationPhotoUrl("Florence", "Italy"),
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
      name: "Copenhagen",
      country: "Denmark",
      image: getDestinationPhotoUrl("Copenhagen", "Denmark"),
    },
    {
      name: "Zurich",
      country: "Switzerland",
      image: getDestinationPhotoUrl("Zurich", "Switzerland"),
    },
    {
      name: "Vienna",
      country: "Austria",
      image: getDestinationPhotoUrl("Vienna", "Austria"),
    },
    {
      name: "Milan",
      country: "Italy",
      image: getDestinationPhotoUrl("Milan", "Italy"),
    },
  ],
  "North America": [
    {
      name: "New York",
      country: "United States",
      image: getDestinationPhotoUrl("New York", "United States"),
    },
    {
      name: "Las Vegas",
      country: "United States",
      image: getDestinationPhotoUrl("Las Vegas", "United States"),
    },
    {
      name: "Toronto",
      country: "Canada",
      image: getDestinationPhotoUrl("Toronto", "Canada"),
    },
    {
      name: "Los Angeles",
      country: "United States",
      image: getDestinationPhotoUrl("Los Angeles", "United States"),
    },
    {
      name: "Miami",
      country: "United States",
      image: getDestinationPhotoUrl("Miami", "United States"),
    },
    {
      name: "Vancouver",
      country: "Canada",
      image: getDestinationPhotoUrl("Vancouver", "Canada"),
    },
    {
      name: "Chicago",
      country: "United States",
      image: getDestinationPhotoUrl("Chicago", "United States"),
    },
    {
      name: "San Francisco",
      country: "United States",
      image: getDestinationPhotoUrl("San Francisco", "United States"),
    },
  ],
  Asia: [
    {
      name: "Tokyo",
      country: "Japan",
      image: getDestinationPhotoUrl("Tokyo", "Japan"),
    },
    {
      name: "Singapore",
      country: "Singapore",
      image: getDestinationPhotoUrl("Singapore", "Singapore"),
    },
    {
      name: "Bangkok",
      country: "Thailand",
      image: getDestinationPhotoUrl("Bangkok", "Thailand"),
    },
    {
      name: "Kuala Lumpur",
      country: "Malaysia",
      image: getDestinationPhotoUrl("Kuala Lumpur", "Malaysia"),
    },
    {
      name: "Seoul",
      country: "South Korea",
      image: getDestinationPhotoUrl("Seoul", "South Korea"),
    },
    {
      name: "Osaka",
      country: "Japan",
      image: getDestinationPhotoUrl("Osaka", "Japan"),
    },
    {
      name: "Bali",
      country: "Indonesia",
      image: getDestinationPhotoUrl("Bali", "Indonesia"),
    },
    {
      name: "Phuket",
      country: "Thailand",
      image: getDestinationPhotoUrl("Phuket", "Thailand"),
    },
  ],
  Africa: [
    {
      name: "Cape Town",
      country: "South Africa",
      image: getDestinationPhotoUrl("Cape Town", "South Africa"),
    },
    {
      name: "Marrakech",
      country: "Morocco",
      image: getDestinationPhotoUrl("Marrakech", "Morocco"),
    },
    {
      name: "Nairobi",
      country: "Kenya",
      image: getDestinationPhotoUrl("Nairobi", "Kenya"),
    },
    {
      name: "Accra",
      country: "Ghana",
      image: getDestinationPhotoUrl("Accra", "Ghana"),
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
  ],
  "Middle East": [
    {
      name: "Dubai",
      country: "United Arab Emirates",
      image: getDestinationPhotoUrl("Dubai", "United Arab Emirates"),
    },
    {
      name: "Istanbul",
      country: "Turkey",
      image: getDestinationPhotoUrl("Istanbul", "Turkey"),
    },
    {
      name: "Doha",
      country: "Qatar",
      image: getDestinationPhotoUrl("Doha", "Qatar"),
    },
    {
      name: "Abu Dhabi",
      country: "United Arab Emirates",
      image: getDestinationPhotoUrl("Abu Dhabi", "United Arab Emirates"),
    },
    {
      name: "Muscat",
      country: "Oman",
      image: getDestinationPhotoUrl("Muscat", "Oman"),
    },
    {
      name: "Jeddah",
      country: "Saudi Arabia",
      image: getDestinationPhotoUrl("Jeddah", "Saudi Arabia"),
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
                  Browse a curated edit of {totalDestinations} highly visual
                  destinations across focused region collections, then jump
                  straight into flight results for the city you like.
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
