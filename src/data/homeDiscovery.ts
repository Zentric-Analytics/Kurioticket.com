export type HomeDiscoveryItem = {
  id: string;
  originCity: string;
  originCode: string;
  destinationCity: string;
  destinationCode: string;
  routeNote: string;
  priceFromUsd: number;
  image: string;
};

const fallbackDiscovery: HomeDiscoveryItem[] = [
  {
    id: "fallback-nyc-lisbon",
    originCity: "New York",
    originCode: "JFK",
    destinationCity: "Lisbon",
    destinationCode: "LIS",
    routeNote: "Sun-soaked streets and Atlantic city views.",
    priceFromUsd: 465,
    image:
      "https://images.unsplash.com/photo-1513735492246-483525079686?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "fallback-dubai-singapore",
    originCity: "Dubai",
    originCode: "DXB",
    destinationCity: "Singapore",
    destinationCode: "SIN",
    routeNote: "Skyline escapes with modern food scenes.",
    priceFromUsd: 512,
    image:
      "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "fallback-london-istanbul",
    originCity: "London",
    originCode: "LHR",
    destinationCity: "Istanbul",
    destinationCode: "IST",
    routeNote: "Historic neighborhoods and vibrant bazaars.",
    priceFromUsd: 274,
    image:
      "https://images.unsplash.com/photo-1527838832700-5059252407fa?auto=format&fit=crop&w=900&q=80",
  },
];

export const homeDiscoveryByRegion: Record<string, HomeDiscoveryItem[]> = {
  NG: [
    {
      id: "ng-lagos-london",
      originCity: "Lagos",
      originCode: "LOS",
      destinationCity: "London",
      destinationCode: "LHR",
      routeNote: "Business-ready schedules and city-weekend options.",
      priceFromUsd: 535,
      image:
        "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "ng-lagos-dubai",
      originCity: "Lagos",
      originCode: "LOS",
      destinationCity: "Dubai",
      destinationCode: "DXB",
      routeNote: "Shopping, stopovers, and warm-weather getaways.",
      priceFromUsd: 498,
      image:
        "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "ng-abuja-accra",
      originCity: "Abuja",
      originCode: "ABV",
      destinationCity: "Accra",
      destinationCode: "ACC",
      routeNote: "Short-haul regional connections for quick trips.",
      priceFromUsd: 205,
      image:
        "https://images.unsplash.com/photo-1466442929976-97f336a657be?auto=format&fit=crop&w=900&q=80",
    },
  ],
  CA: [
    {
      id: "ca-toronto-vancouver",
      originCity: "Toronto",
      originCode: "YYZ",
      destinationCity: "Vancouver",
      destinationCode: "YVR",
      routeNote: "Coast-to-coast routes with flexible timings.",
      priceFromUsd: 184,
      image:
        "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "ca-montreal-paris",
      originCity: "Montreal",
      originCode: "YUL",
      destinationCity: "Paris",
      destinationCode: "CDG",
      routeNote: "Popular transatlantic options for city breaks.",
      priceFromUsd: 427,
      image:
        "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80",
    },
  ],
  GB: [
    {
      id: "gb-london-barcelona",
      originCity: "London",
      originCode: "LHR",
      destinationCity: "Barcelona",
      destinationCode: "BCN",
      routeNote: "Fast weekend hops for sun and food.",
      priceFromUsd: 149,
      image:
        "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "gb-manchester-rome",
      originCity: "Manchester",
      originCode: "MAN",
      destinationCity: "Rome",
      destinationCode: "FCO",
      routeNote: "Short city escapes with rich culture.",
      priceFromUsd: 168,
      image:
        "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=900&q=80",
    },
  ],
  US: [
    {
      id: "us-nyc-miami",
      originCity: "New York",
      originCode: "JFK",
      destinationCity: "Miami",
      destinationCode: "MIA",
      routeNote: "Beach weekends and nonstop options year-round.",
      priceFromUsd: 129,
      image:
        "https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "us-chicago-vegas",
      originCity: "Chicago",
      originCode: "ORD",
      destinationCity: "Las Vegas",
      destinationCode: "LAS",
      routeNote: "Entertainment trips with frequent departures.",
      priceFromUsd: 154,
      image:
        "https://images.unsplash.com/photo-1507069803602-8f153bc4e0d2?auto=format&fit=crop&w=900&q=80",
    },
  ],
  fallback: fallbackDiscovery,
};

export function getHomeDiscoveryByRegion(regionCode?: string | null): HomeDiscoveryItem[] {
  if (!regionCode) return fallbackDiscovery;
  return homeDiscoveryByRegion[regionCode] ?? fallbackDiscovery;
}
