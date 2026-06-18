import { resolveMarket, type MarketFallbackLevel } from "@/lib/market/resolveMarket";

import { validateDestinationImages } from "./destinationImageValidation";

export type PopularDestination = {
  id: string;
  code: string;
  originCode: string;
  city: string;
  country: string;
  imageAlt: string;
  image: string;
};

export type MarketContentResolution<T> = {
  requestedRegionCode: string;
  effectiveMarketCode: string;
  fallbackLevel: MarketFallbackLevel;
  fallbackUsed: boolean;
  items: T[];
};

export const popularDestinationsByMarket: Record<
  string,
  PopularDestination[]
> = {
  US: [
    {
      id: "us-new-york",
      code: "EWR",
      originCode: "JFK",
      city: "New York",
      country: "United States",
      imageAlt: "Statue of Liberty with One World Trade Center and Lower Manhattan skyline",
      image:
        "/images/premium/homepage/destinations/kurioticket-homepage-destination-new-york-statue-liberty-skyline-001.jpg",
    },
    {
      id: "us-miami",
      code: "MIA",
      originCode: "BOS",
      city: "Miami",
      country: "United States",
      imageAlt: "Miami waterfront skyline with palm trees and downtown towers",
      image:
        "/images/premium/homepage/destinations/kurioticket-homepage-destination-miami-skyline-waterfront-001.jpg",
    },
    {
      id: "us-las-vegas",
      code: "LAS",
      originCode: "ORD",
      city: "Las Vegas",
      country: "United States",
      imageAlt: "Las Vegas Strip skyline at night from above",
      image:
        "/images/premium/homepage/destinations/kurioticket-homepage-destination-las-vegas-strip-night-drone-001.jpg",
    },
    {
      id: "us-los-angeles",
      code: "LAX",
      originCode: "JFK",
      city: "Los Angeles",
      country: "United States",
      imageAlt: "Los Angeles skyline viewed through palm trees at golden hour",
      image:
        "/images/premium/homepage/destinations/kurioticket-homepage-destination-los-angeles-palm-skyline-001.jpg",
    },
    {
      id: "us-london",
      code: "LHR",
      originCode: "JFK",
      city: "London",
      country: "United Kingdom",
      imageAlt: "Tower Bridge over the River Thames in London",
      image:
        "/images/premium/homepage/destinations/kurioticket-homepage-destination-london-tower-bridge-thames-001.jpg",
    },
    {
      id: "us-paris",
      code: "CDG",
      originCode: "JFK",
      city: "Paris",
      country: "France",
      imageAlt: "Eiffel Tower framed by Paris apartment buildings",
      image:
        "/images/premium/homepage/destinations/kurioticket-homepage-destination-paris-eiffel-tower-buildings-001.jpg",
    },
  ],
  NG: [
    {
      id: "ng-dubai",
      code: "DXB",
      originCode: "LOS",
      city: "Dubai",
      country: "United Arab Emirates",
      imageAlt: "Downtown Dubai skyline with Burj Khalifa",
      image:
        "https://images.pexels.com/photos/21765772/pexels-photo-21765772.jpeg?auto=compress&cs=tinysrgb&w=1600",
    },
    {
      id: "ng-london",
      code: "LHR",
      originCode: "LOS",
      city: "London",
      country: "United Kingdom",
      imageAlt: "London skyline and historic landmarks",
      image:
        "https://images.pexels.com/photos/33843218/pexels-photo-33843218.jpeg?auto=compress&cs=tinysrgb&w=1600",
    },
    {
      id: "ng-johannesburg",
      code: "JNB",
      originCode: "LOS",
      city: "Johannesburg",
      country: "South Africa",
      imageAlt: "Johannesburg skyline at golden hour",
      image:
        "https://images.unsplash.com/photo-1604633193983-5ad0f0f9d4f8?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "ng-accra",
      code: "ACC",
      originCode: "LOS",
      city: "Accra",
      country: "Ghana",
      imageAlt: "Accra coastal city scene and palm trees",
      image:
        "https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "ng-nairobi",
      code: "NBO",
      originCode: "LOS",
      city: "Nairobi",
      country: "Kenya",
      imageAlt: "Nairobi skyline near national park grasslands",
      image:
        "https://images.unsplash.com/photo-1611348586804-61bf6c080437?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "ng-istanbul",
      code: "IST",
      originCode: "LOS",
      city: "Istanbul",
      country: "Türkiye",
      imageAlt: "Istanbul skyline with domes and minarets",
      image:
        "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "ng-paris",
      code: "CDG",
      originCode: "ABV",
      city: "Paris",
      country: "France",
      imageAlt: "Eiffel Tower above Paris streets",
      image:
        "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=90",
    },
  ],
  KE: [
    {
      id: "ke-dubai",
      code: "DXB",
      originCode: "NBO",
      city: "Dubai",
      country: "United Arab Emirates",
      imageAlt: "Downtown Dubai skyline with Burj Khalifa",
      image:
        "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "ke-zanzibar",
      code: "ZNZ",
      originCode: "NBO",
      city: "Zanzibar",
      country: "Tanzania",
      imageAlt: "Zanzibar beach with clear blue water",
      image:
        "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "ke-london",
      code: "LHR",
      originCode: "NBO",
      city: "London",
      country: "United Kingdom",
      imageAlt: "London skyline and historic landmarks",
      image:
        "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "ke-johannesburg",
      code: "JNB",
      originCode: "NBO",
      city: "Johannesburg",
      country: "South Africa",
      imageAlt: "Johannesburg skyline at golden hour",
      image:
        "https://images.unsplash.com/photo-1577948000111-9c970dfe3743?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "ke-addis-ababa",
      code: "ADD",
      originCode: "NBO",
      city: "Addis Ababa",
      country: "Ethiopia",
      imageAlt: "Addis Ababa cityscape in the Ethiopian highlands",
      image:
        "https://images.unsplash.com/photo-1629309786717-9505f20599c2?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "ke-istanbul",
      code: "IST",
      originCode: "NBO",
      city: "Istanbul",
      country: "Türkiye",
      imageAlt: "Blue Mosque and Istanbul skyline",
      image:
        "https://images.pexels.com/photos/11540297/pexels-photo-11540297.jpeg?auto=compress&cs=tinysrgb&w=1600",
    },
  ],
  ZA: [
    {
      id: "za-london",
      code: "LHR",
      originCode: "JNB",
      city: "London",
      country: "United Kingdom",
      imageAlt: "London skyline and historic landmarks",
      image:
        "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=1600",
    },
    {
      id: "za-dubai",
      code: "DXB",
      originCode: "JNB",
      city: "Dubai",
      country: "United Arab Emirates",
      imageAlt: "Downtown Dubai skyline with Burj Khalifa",
      image:
        "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "za-cape-town",
      code: "CPT",
      originCode: "JNB",
      city: "Cape Town",
      country: "South Africa",
      imageAlt: "Cape Town city and Table Mountain",
      image:
        "https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "za-mauritius",
      code: "MRU",
      originCode: "JNB",
      city: "Mauritius",
      country: "Mauritius",
      imageAlt: "Mauritius lagoon and tropical coastline",
      image:
        "https://images.unsplash.com/photo-1513415564515-763d91423bdd?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "za-nairobi",
      code: "NBO",
      originCode: "JNB",
      city: "Nairobi",
      country: "Kenya",
      imageAlt: "Nairobi skyline near national park grasslands",
      image:
        "https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "za-paris",
      code: "CDG",
      originCode: "JNB",
      city: "Paris",
      country: "France",
      imageAlt: "Paris rooftops and Eiffel Tower",
      image:
        "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1600&q=90",
    },
  ],
  DE: [
    {
      id: "de-london",
      code: "LHR",
      originCode: "FRA",
      city: "London",
      country: "United Kingdom",
      imageAlt: "London skyline and historic landmarks",
      image:
        "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "de-paris",
      code: "CDG",
      originCode: "FRA",
      city: "Paris",
      country: "France",
      imageAlt: "Eiffel Tower above Paris streets",
      image:
        "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "de-amsterdam",
      code: "AMS",
      originCode: "FRA",
      city: "Amsterdam",
      country: "Netherlands",
      imageAlt: "Amsterdam canals and historic homes",
      image:
        "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "de-rome",
      code: "FCO",
      originCode: "MUC",
      city: "Rome",
      country: "Italy",
      imageAlt: "The Colosseum and city streets in Rome",
      image:
        "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "de-istanbul",
      code: "IST",
      originCode: "FRA",
      city: "Istanbul",
      country: "Türkiye",
      imageAlt: "Istanbul skyline with domes and minarets",
      image:
        "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "de-dubai",
      code: "DXB",
      originCode: "FRA",
      city: "Dubai",
      country: "United Arab Emirates",
      imageAlt: "Downtown Dubai skyline with Burj Khalifa",
      image:
        "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1600&q=90",
    },
  ],
  GB: [
    {
      id: "gb-paris",
      code: "CDG",
      originCode: "LHR",
      city: "Paris",
      country: "France",
      imageAlt: "Paris rooftops and Eiffel Tower",
      image:
        "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "gb-rome",
      code: "FCO",
      originCode: "LHR",
      city: "Rome",
      country: "Italy",
      imageAlt: "The Colosseum and city streets in Rome",
      image:
        "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "gb-barcelona",
      code: "BCN",
      originCode: "LHR",
      city: "Barcelona",
      country: "Spain",
      imageAlt: "Barcelona city streets and architecture",
      image:
        "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "gb-amsterdam",
      code: "AMS",
      originCode: "LHR",
      city: "Amsterdam",
      country: "Netherlands",
      imageAlt: "Amsterdam canals and historic homes",
      image:
        "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "gb-istanbul",
      code: "IST",
      originCode: "LHR",
      city: "Istanbul",
      country: "Türkiye",
      imageAlt: "Istanbul skyline with domes and minarets",
      image:
        "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "gb-dubai",
      code: "DXB",
      originCode: "LHR",
      city: "Dubai",
      country: "United Arab Emirates",
      imageAlt: "Downtown Dubai skyline with Burj Khalifa",
      image:
        "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1600&q=90",
    },
  ],
  AE: [
    {
      id: "ae-london",
      code: "LHR",
      originCode: "DXB",
      city: "London",
      country: "United Kingdom",
      imageAlt: "London skyline and historic landmarks",
      image:
        "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "ae-istanbul",
      code: "IST",
      originCode: "DXB",
      city: "Istanbul",
      country: "Türkiye",
      imageAlt: "Istanbul skyline with domes and minarets",
      image:
        "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "ae-cairo",
      code: "CAI",
      originCode: "DXB",
      city: "Cairo",
      country: "Egypt",
      imageAlt: "Cairo skyline with the Pyramids of Giza",
      image:
        "https://images.unsplash.com/photo-1539650116574-75c0c6d73b77?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "ae-singapore",
      code: "SIN",
      originCode: "DXB",
      city: "Singapore",
      country: "Singapore",
      imageAlt: "Marina Bay skyline in Singapore at dusk",
      image:
        "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "ae-bangkok",
      code: "BKK",
      originCode: "DXB",
      city: "Bangkok",
      country: "Thailand",
      imageAlt: "Bangkok skyline and temples",
      image:
        "https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "ae-paris",
      code: "CDG",
      originCode: "DXB",
      city: "Paris",
      country: "France",
      imageAlt: "Eiffel Tower above Paris streets",
      image:
        "https://images.pexels.com/photos/2082103/pexels-photo-2082103.jpeg?auto=compress&cs=tinysrgb&w=1600",
    },
  ],
  JP: [
    {
      id: "jp-seoul",
      code: "ICN",
      originCode: "NRT",
      city: "Seoul",
      country: "South Korea",
      imageAlt: "Seoul city skyline at dusk",
      image:
        "https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "jp-singapore",
      code: "SIN",
      originCode: "NRT",
      city: "Singapore",
      country: "Singapore",
      imageAlt: "Marina Bay skyline in Singapore at dusk",
      image:
        "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "jp-bangkok",
      code: "BKK",
      originCode: "NRT",
      city: "Bangkok",
      country: "Thailand",
      imageAlt: "Bangkok skyline and temples",
      image:
        "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "jp-hong-kong",
      code: "HKG",
      originCode: "NRT",
      city: "Hong Kong",
      country: "Hong Kong",
      imageAlt: "Hong Kong harbor skyline at night",
      image:
        "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "jp-dubai",
      code: "DXB",
      originCode: "NRT",
      city: "Dubai",
      country: "United Arab Emirates",
      imageAlt: "Downtown Dubai skyline with Burj Khalifa",
      image:
        "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "jp-bali",
      code: "DPS",
      originCode: "NRT",
      city: "Bali",
      country: "Indonesia",
      imageAlt: "Bali cliffs and tropical ocean",
      image:
        "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1600&q=92",
    },
  ],
  BR: [
    {
      id: "br-buenos-aires",
      code: "EZE",
      originCode: "GRU",
      city: "Buenos Aires",
      country: "Argentina",
      imageAlt: "Buenos Aires city avenue and skyline",
      image:
        "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "br-lima",
      code: "LIM",
      originCode: "GRU",
      city: "Lima",
      country: "Peru",
      imageAlt: "Miraflores coastline and city skyline in Lima",
      image:
        "https://images.unsplash.com/photo-1531968455001-5c5272a41129?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "br-santiago",
      code: "SCL",
      originCode: "GRU",
      city: "Santiago",
      country: "Chile",
      imageAlt: "Santiago skyline with Andes mountains",
      image:
        "https://images.unsplash.com/photo-1597006438013-2a37fb4f817a?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "br-lisbon",
      code: "LIS",
      originCode: "GRU",
      city: "Lisbon",
      country: "Portugal",
      imageAlt: "Historic tram on a Lisbon hillside street",
      image:
        "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "br-miami",
      code: "MIA",
      originCode: "GRU",
      city: "Miami",
      country: "United States",
      imageAlt: "Miami Beach lifeguard tower and palms",
      image:
        "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "br-rio",
      code: "GIG",
      originCode: "GRU",
      city: "Rio de Janeiro",
      country: "Brazil",
      imageAlt: "Rio de Janeiro coastline and mountains",
      image:
        "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1600&q=90",
    },
  ],
};


function appendPopularDestinationRoutes(
  marketCode: string,
  items: PopularDestination[],
) {
  popularDestinationsByMarket[marketCode] = [
    ...(popularDestinationsByMarket[marketCode] ?? []),
    ...items.map((item) => ({
      ...item,
      image: addPopularImageSignature(marketCode, item.image, item.id),
    })),
  ];
}

const cardImagePhotoIds = [
  338515, 532826, 753626, 466685, 21014, 672358, 59519, 417074,
  2166553, 2474690, 1450353, 2901209, 346885, 356830, 164595,
  258154, 261102, 210243, 7536261, 3278215, 3225531, 161853,
  2422461, 2246476, 3889855, 1008155, 1051075, 208745, 2363,
  358229, 258383, 457882, 221457, 2104882, 2356045, 3769138,
  2403209, 3361480, 3155666, 347141, 358457, 460376, 7536262,
] as const;

const popularImageSignatureIndexByMarket = new Map<string, number>();

function addPopularImageSignature(
  marketCode: string,
  image: string,
  signature: string,
) {
  void image;
  void signature;
  const marketIndex = popularImageSignatureIndexByMarket.get(marketCode) ?? 0;
  const photoId = cardImagePhotoIds[marketIndex % cardImagePhotoIds.length];

  popularImageSignatureIndexByMarket.set(marketCode, marketIndex + 1);

  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=1200`;
}

const popularRouteImageByCity = {
  london:
    "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1600&q=90",
  dubai:
    "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1600&q=90",
  paris:
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=90",
  istanbul:
    "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1600&q=90",
  capeTown:
    "https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?auto=format&fit=crop&w=1600&q=90",
  bangkok:
    "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1600&q=90",
  city:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=90",
} as const;

appendPopularDestinationRoutes("NG", [
  { id: "ng-abv-dubai", code: "DXB", originCode: "ABV", city: "Dubai", country: "United Arab Emirates", imageAlt: "Downtown Dubai skyline with Burj Khalifa", image: popularRouteImageByCity.dubai },
  { id: "ng-abv-london", code: "LHR", originCode: "ABV", city: "London", country: "United Kingdom", imageAlt: "London skyline and historic landmarks", image: popularRouteImageByCity.london },
  { id: "ng-acc-dubai", code: "DXB", originCode: "ACC", city: "Dubai", country: "United Arab Emirates", imageAlt: "Downtown Dubai skyline with Burj Khalifa", image: popularRouteImageByCity.dubai },
]);
appendPopularDestinationRoutes("KE", [
  { id: "ke-cape-town", code: "CPT", originCode: "NBO", city: "Cape Town", country: "South Africa", imageAlt: "Cape Town city and Table Mountain", image: popularRouteImageByCity.capeTown },
  { id: "ke-istanbul", code: "IST", originCode: "NBO", city: "Istanbul", country: "Türkiye", imageAlt: "Istanbul skyline with domes and minarets", image: popularRouteImageByCity.istanbul },
  { id: "ke-paris", code: "CDG", originCode: "NBO", city: "Paris", country: "France", imageAlt: "Eiffel Tower above Paris streets", image: popularRouteImageByCity.paris },
]);
appendPopularDestinationRoutes("ZA", [
  { id: "za-cpt-london", code: "LHR", originCode: "CPT", city: "London", country: "United Kingdom", imageAlt: "London skyline and historic landmarks", image: popularRouteImageByCity.london },
  { id: "za-cpt-dubai", code: "DXB", originCode: "CPT", city: "Dubai", country: "United Arab Emirates", imageAlt: "Downtown Dubai skyline with Burj Khalifa", image: popularRouteImageByCity.dubai },
]);
appendPopularDestinationRoutes("DE", [
  { id: "de-barcelona", code: "BCN", originCode: "FRA", city: "Barcelona", country: "Spain", imageAlt: "Barcelona city streets and architecture", image: popularRouteImageByCity.city },
  { id: "de-rome-fra", code: "FCO", originCode: "FRA", city: "Rome", country: "Italy", imageAlt: "The Colosseum and city streets in Rome", image: popularRouteImageByCity.city },
]);
appendPopularDestinationRoutes("GB", [
  { id: "gb-dxb-alt", code: "DXB", originCode: "LHR", city: "Dubai", country: "United Arab Emirates", imageAlt: "Downtown Dubai skyline with Burj Khalifa", image: popularRouteImageByCity.dubai },
  { id: "gb-paris-alt", code: "CDG", originCode: "LHR", city: "Paris", country: "France", imageAlt: "Eiffel Tower above Paris streets", image: popularRouteImageByCity.paris },
]);
appendPopularDestinationRoutes("AE", [
  { id: "ae-jeddah", code: "JED", originCode: "DXB", city: "Jeddah", country: "Saudi Arabia", imageAlt: "Jeddah waterfront and city skyline", image: popularRouteImageByCity.city },
  { id: "ae-bangkok-alt", code: "BKK", originCode: "DXB", city: "Bangkok", country: "Thailand", imageAlt: "Bangkok skyline and temples", image: popularRouteImageByCity.bangkok },
]);
appendPopularDestinationRoutes("JP", [
  { id: "jp-seoul-hnd", code: "ICN", originCode: "HND", city: "Seoul", country: "South Korea", imageAlt: "Seoul city skyline at dusk", image: popularRouteImageByCity.city },
  { id: "jp-singapore-hnd", code: "SIN", originCode: "HND", city: "Singapore", country: "Singapore", imageAlt: "Marina Bay skyline in Singapore at dusk", image: popularRouteImageByCity.city },
]);
appendPopularDestinationRoutes("BR", [
  { id: "br-madrid", code: "MAD", originCode: "GRU", city: "Madrid", country: "Spain", imageAlt: "Madrid streets and historic architecture", image: popularRouteImageByCity.city },
  { id: "br-bogota", code: "BOG", originCode: "GRU", city: "Bogota", country: "Colombia", imageAlt: "Bogota city skyline and mountains", image: popularRouteImageByCity.city },
]);
appendPopularDestinationRoutes("US", [
  { id: "us-atlanta", code: "ATL", originCode: "JFK", city: "Atlanta", country: "United States", imageAlt: "Atlanta skyline at sunset", image: popularRouteImageByCity.city },
  { id: "us-chicago", code: "ORD", originCode: "LAX", city: "Chicago", country: "United States", imageAlt: "Chicago skyline beside Lake Michigan", image: popularRouteImageByCity.city },
  { id: "us-dallas", code: "DFW", originCode: "LAX", city: "Dallas", country: "United States", imageAlt: "Dallas skyline and city lights", image: popularRouteImageByCity.city },
  { id: "us-denver", code: "DEN", originCode: "JFK", city: "Denver", country: "United States", imageAlt: "Denver skyline with mountain backdrop", image: popularRouteImageByCity.city },
  { id: "us-seattle", code: "SEA", originCode: "JFK", city: "Seattle", country: "United States", imageAlt: "Seattle skyline and waterfront", image: popularRouteImageByCity.city },
  { id: "us-san-francisco", code: "SFO", originCode: "JFK", city: "San Francisco", country: "United States", imageAlt: "San Francisco bridge and bay", image: popularRouteImageByCity.city },
  { id: "us-orlando", code: "MCO", originCode: "EWR", city: "Orlando", country: "United States", imageAlt: "Orlando palms and lakefront", image: popularRouteImageByCity.city },
  { id: "us-phoenix", code: "PHX", originCode: "ORD", city: "Phoenix", country: "United States", imageAlt: "Phoenix desert skyline", image: popularRouteImageByCity.city },
  { id: "us-boston", code: "BOS", originCode: "LAX", city: "Boston", country: "United States", imageAlt: "Boston harbor and skyline", image: popularRouteImageByCity.city },
  { id: "us-washington", code: "DCA", originCode: "LAX", city: "Washington", country: "United States", imageAlt: "Washington DC monuments and skyline", image: popularRouteImageByCity.city },
]);
appendPopularDestinationRoutes("NG", [
  { id: "ng-los-cdg-provider", code: "CDG", originCode: "LOS", city: "Paris", country: "France", imageAlt: "Eiffel Tower above Paris streets", image: popularRouteImageByCity.paris },
  { id: "ng-los-nbo-provider", code: "NBO", originCode: "LOS", city: "Nairobi", country: "Kenya", imageAlt: "Nairobi skyline near national park grasslands", image: popularRouteImageByCity.city },
  { id: "ng-acc-london", code: "LHR", originCode: "ACC", city: "London", country: "United Kingdom", imageAlt: "London skyline and historic landmarks", image: popularRouteImageByCity.london },
  { id: "ng-los-cairo", code: "CAI", originCode: "LOS", city: "Cairo", country: "Egypt", imageAlt: "Cairo skyline near the Pyramids", image: popularRouteImageByCity.city },
  { id: "ng-los-addis", code: "ADD", originCode: "LOS", city: "Addis Ababa", country: "Ethiopia", imageAlt: "Addis Ababa cityscape", image: popularRouteImageByCity.city },
  { id: "ng-abv-istanbul", code: "IST", originCode: "ABV", city: "Istanbul", country: "Türkiye", imageAlt: "Istanbul skyline with domes and minarets", image: popularRouteImageByCity.istanbul },
]);
appendPopularDestinationRoutes("KE", [
  { id: "ke-addis", code: "ADD", originCode: "NBO", city: "Addis Ababa", country: "Ethiopia", imageAlt: "Addis Ababa cityscape", image: popularRouteImageByCity.city },
  { id: "ke-dar", code: "DAR", originCode: "NBO", city: "Dar es Salaam", country: "Tanzania", imageAlt: "Dar es Salaam coastline and city", image: popularRouteImageByCity.city },
  { id: "ke-bangkok", code: "BKK", originCode: "NBO", city: "Bangkok", country: "Thailand", imageAlt: "Bangkok skyline and temples", image: popularRouteImageByCity.bangkok },
  { id: "ke-doha", code: "DOH", originCode: "NBO", city: "Doha", country: "Qatar", imageAlt: "Doha skyline and waterfront", image: popularRouteImageByCity.city },
  { id: "ke-mauritius", code: "MRU", originCode: "NBO", city: "Mauritius", country: "Mauritius", imageAlt: "Mauritius lagoon and tropical coastline", image: popularRouteImageByCity.city },
  { id: "ke-amsterdam", code: "AMS", originCode: "NBO", city: "Amsterdam", country: "Netherlands", imageAlt: "Amsterdam canals and historic homes", image: popularRouteImageByCity.city },
  { id: "ke-cairo", code: "CAI", originCode: "NBO", city: "Cairo", country: "Egypt", imageAlt: "Cairo skyline near the Pyramids", image: popularRouteImageByCity.city },
]);
appendPopularDestinationRoutes("ZA", [
  { id: "za-durban-jnb", code: "JNB", originCode: "DUR", city: "Johannesburg", country: "South Africa", imageAlt: "Johannesburg skyline at golden hour", image: popularRouteImageByCity.city },
  { id: "za-jnb-addis", code: "ADD", originCode: "JNB", city: "Addis Ababa", country: "Ethiopia", imageAlt: "Addis Ababa cityscape", image: popularRouteImageByCity.city },
  { id: "za-jnb-paris", code: "CDG", originCode: "JNB", city: "Paris", country: "France", imageAlt: "Eiffel Tower above Paris streets", image: popularRouteImageByCity.paris },
  { id: "za-cpt-paris", code: "CDG", originCode: "CPT", city: "Paris", country: "France", imageAlt: "Eiffel Tower above Paris streets", image: popularRouteImageByCity.paris },
  { id: "za-jnb-lisbon", code: "LIS", originCode: "JNB", city: "Lisbon", country: "Portugal", imageAlt: "Historic Lisbon streets and hills", image: popularRouteImageByCity.city },
  { id: "za-cpt-mauritius", code: "MRU", originCode: "CPT", city: "Mauritius", country: "Mauritius", imageAlt: "Mauritius lagoon and tropical coastline", image: popularRouteImageByCity.city },
  { id: "za-jnb-accra", code: "ACC", originCode: "JNB", city: "Accra", country: "Ghana", imageAlt: "Accra coastal city scene and palm trees", image: popularRouteImageByCity.city },
  { id: "za-cpt-accra", code: "ACC", originCode: "CPT", city: "Accra", country: "Ghana", imageAlt: "Accra coastal city scene and palm trees", image: popularRouteImageByCity.city },
]);
appendPopularDestinationRoutes("DE", [
  { id: "de-vienna", code: "VIE", originCode: "FRA", city: "Vienna", country: "Austria", imageAlt: "Vienna historic center", image: popularRouteImageByCity.city },
  { id: "de-zurich", code: "ZRH", originCode: "FRA", city: "Zurich", country: "Switzerland", imageAlt: "Zurich skyline and lake", image: popularRouteImageByCity.city },
  { id: "de-muc-madrid", code: "MAD", originCode: "MUC", city: "Madrid", country: "Spain", imageAlt: "Madrid streets and historic architecture", image: popularRouteImageByCity.city },
  { id: "de-ber-london", code: "LHR", originCode: "BER", city: "London", country: "United Kingdom", imageAlt: "London skyline and historic landmarks", image: popularRouteImageByCity.london },
  { id: "de-fra-lisbon", code: "LIS", originCode: "FRA", city: "Lisbon", country: "Portugal", imageAlt: "Historic Lisbon streets and hills", image: popularRouteImageByCity.city },
  { id: "de-muc-paris", code: "CDG", originCode: "MUC", city: "Paris", country: "France", imageAlt: "Eiffel Tower above Paris streets", image: popularRouteImageByCity.paris },
  { id: "de-fra-madrid", code: "MAD", originCode: "FRA", city: "Madrid", country: "Spain", imageAlt: "Madrid streets and historic architecture", image: popularRouteImageByCity.city },
  { id: "de-muc-london", code: "LHR", originCode: "MUC", city: "London", country: "United Kingdom", imageAlt: "London skyline and historic landmarks", image: popularRouteImageByCity.london },
]);
appendPopularDestinationRoutes("GB", [
  { id: "gb-ams-alt", code: "AMS", originCode: "LHR", city: "Amsterdam", country: "Netherlands", imageAlt: "Amsterdam canals and historic homes", image: popularRouteImageByCity.city },
  { id: "gb-madrid", code: "MAD", originCode: "LHR", city: "Madrid", country: "Spain", imageAlt: "Madrid streets and historic architecture", image: popularRouteImageByCity.city },
  { id: "gb-rome", code: "FCO", originCode: "LHR", city: "Rome", country: "Italy", imageAlt: "The Colosseum and city streets in Rome", image: popularRouteImageByCity.city },
  { id: "gb-lisbon", code: "LIS", originCode: "LHR", city: "Lisbon", country: "Portugal", imageAlt: "Historic Lisbon streets and hills", image: popularRouteImageByCity.city },
  { id: "gb-barcelona", code: "BCN", originCode: "LHR", city: "Barcelona", country: "Spain", imageAlt: "Barcelona city streets and architecture", image: popularRouteImageByCity.city },
  { id: "gb-istanbul", code: "IST", originCode: "LHR", city: "Istanbul", country: "Türkiye", imageAlt: "Istanbul skyline with domes and minarets", image: popularRouteImageByCity.istanbul },
  { id: "gb-new-york", code: "JFK", originCode: "LHR", city: "New York", country: "United States", imageAlt: "New York skyline and city streets", image: popularRouteImageByCity.city },
  { id: "gb-doha", code: "DOH", originCode: "LHR", city: "Doha", country: "Qatar", imageAlt: "Doha skyline and waterfront", image: popularRouteImageByCity.city },
]);
appendPopularDestinationRoutes("AE", [
  { id: "ae-cairo", code: "CAI", originCode: "DXB", city: "Cairo", country: "Egypt", imageAlt: "Cairo skyline near the Pyramids", image: popularRouteImageByCity.city },
  { id: "ae-singapore-alt", code: "SIN", originCode: "DXB", city: "Singapore", country: "Singapore", imageAlt: "Marina Bay skyline in Singapore at dusk", image: popularRouteImageByCity.city },
  { id: "ae-ruh", code: "RUH", originCode: "DXB", city: "Riyadh", country: "Saudi Arabia", imageAlt: "Riyadh skyline and towers", image: popularRouteImageByCity.city },
  { id: "ae-auh-london", code: "LHR", originCode: "AUH", city: "London", country: "United Kingdom", imageAlt: "London skyline and historic landmarks", image: popularRouteImageByCity.london },
  { id: "ae-doh-london", code: "LHR", originCode: "DOH", city: "London", country: "United Kingdom", imageAlt: "London skyline and historic landmarks", image: popularRouteImageByCity.london },
  { id: "ae-kuala-lumpur", code: "KUL", originCode: "DXB", city: "Kuala Lumpur", country: "Malaysia", imageAlt: "Kuala Lumpur skyline at dusk", image: popularRouteImageByCity.city },
  { id: "ae-amsterdam", code: "AMS", originCode: "DXB", city: "Amsterdam", country: "Netherlands", imageAlt: "Amsterdam canals and historic homes", image: popularRouteImageByCity.city },
  { id: "ae-madrid", code: "MAD", originCode: "DXB", city: "Madrid", country: "Spain", imageAlt: "Madrid streets and historic architecture", image: popularRouteImageByCity.city },
]);
appendPopularDestinationRoutes("JP", [
  { id: "jp-kuala-lumpur", code: "KUL", originCode: "NRT", city: "Kuala Lumpur", country: "Malaysia", imageAlt: "Kuala Lumpur skyline at dusk", image: popularRouteImageByCity.city },
  { id: "jp-taipei", code: "TPE", originCode: "HND", city: "Taipei", country: "Taiwan", imageAlt: "Taipei skyline and city streets", image: popularRouteImageByCity.city },
  { id: "jp-osaka-bangkok", code: "BKK", originCode: "KIX", city: "Bangkok", country: "Thailand", imageAlt: "Bangkok skyline and temples", image: popularRouteImageByCity.bangkok },
  { id: "jp-madrid", code: "MAD", originCode: "NRT", city: "Madrid", country: "Spain", imageAlt: "Madrid streets and historic architecture", image: popularRouteImageByCity.city },
  { id: "jp-hong-kong", code: "HKG", originCode: "NRT", city: "Hong Kong", country: "Hong Kong", imageAlt: "Hong Kong skyline and Victoria Harbour at night", image: popularRouteImageByCity.city },
  { id: "jp-bali", code: "DPS", originCode: "NRT", city: "Bali", country: "Indonesia", imageAlt: "Bali cliffs and tropical ocean", image: popularRouteImageByCity.city },
  { id: "jp-manila", code: "MNL", originCode: "NRT", city: "Manila", country: "Philippines", imageAlt: "Manila skyline and bay", image: popularRouteImageByCity.city },
  { id: "jp-hanoi", code: "HAN", originCode: "NRT", city: "Hanoi", country: "Vietnam", imageAlt: "Hanoi old quarter streets", image: popularRouteImageByCity.city },
]);
appendPopularDestinationRoutes("BR", [
  { id: "br-lisbon", code: "LIS", originCode: "GRU", city: "Lisbon", country: "Portugal", imageAlt: "Historic Lisbon streets and hills", image: popularRouteImageByCity.city },
  { id: "br-mex-cancun", code: "CUN", originCode: "MEX", city: "Cancun", country: "Mexico", imageAlt: "White sand beach and turquoise water in Cancun", image: popularRouteImageByCity.city },
  { id: "br-mex-madrid", code: "MAD", originCode: "MEX", city: "Madrid", country: "Spain", imageAlt: "Madrid streets and historic architecture", image: popularRouteImageByCity.city },
  { id: "br-bog-miami", code: "MIA", originCode: "BOG", city: "Miami", country: "United States", imageAlt: "Miami Beach lifeguard tower and palms", image: popularRouteImageByCity.city },
  { id: "br-lima-madrid", code: "MAD", originCode: "LIM", city: "Madrid", country: "Spain", imageAlt: "Madrid streets and historic architecture", image: popularRouteImageByCity.city },
  { id: "br-san-jose", code: "SJO", originCode: "GRU", city: "San Jose", country: "Costa Rica", imageAlt: "San Jose skyline with green hills", image: popularRouteImageByCity.city },
  { id: "br-bog-cancun", code: "CUN", originCode: "BOG", city: "Cancun", country: "Mexico", imageAlt: "White sand beach and turquoise water in Cancun", image: popularRouteImageByCity.city },
  { id: "br-gig-madrid", code: "MAD", originCode: "GIG", city: "Madrid", country: "Spain", imageAlt: "Madrid streets and historic architecture", image: popularRouteImageByCity.city },
]);
popularDestinationsByMarket.AFRICA = popularDestinationsByMarket.NG;
popularDestinationsByMarket.EUROPE = popularDestinationsByMarket.DE;
popularDestinationsByMarket.MIDDLE_EAST = popularDestinationsByMarket.AE;
popularDestinationsByMarket.ASIA = popularDestinationsByMarket.JP;
popularDestinationsByMarket.LATIN_AMERICA = popularDestinationsByMarket.BR;
popularDestinationsByMarket.CANADA = [
  {
    id: "ca-vancouver",
    code: "YVR",
    originCode: "YYZ",
    city: "Vancouver",
    country: "Canada",
    imageAlt: "Vancouver skyline with mountains and harbor",
    image:
      "https://images.unsplash.com/photo-1559511260-66a654ae982a?auto=format&fit=crop&w=1600&q=90",
  },
  {
    id: "ca-cancun",
    code: "CUN",
    originCode: "YYZ",
    city: "Cancun",
    country: "Mexico",
    imageAlt: "White sand beach and turquoise water in Cancun",
    image:
      "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=1600&q=90",
  },
  {
    id: "ca-new-york",
    code: "EWR",
    originCode: "YYZ",
    city: "New York",
    country: "United States",
    imageAlt: "New York skyline and city streets",
    image:
      "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=1600&q=90",
  },
  {
    id: "ca-london",
    code: "LHR",
    originCode: "YYZ",
    city: "London",
    country: "United Kingdom",
    imageAlt: "London skyline and historic landmarks",
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1600&q=90",
  },
  {
    id: "ca-paris",
    code: "CDG",
    originCode: "YYZ",
    city: "Paris",
    country: "France",
    imageAlt: "Eiffel Tower above Paris streets",
    image:
      "https://images.pexels.com/photos/2082103/pexels-photo-2082103.jpeg?auto=compress&cs=tinysrgb&w=1600",
  },
];
appendPopularDestinationRoutes("CANADA", [
  { id: "ca-montreal", code: "YUL", originCode: "YYZ", city: "Montreal", country: "Canada", imageAlt: "Montreal skyline and old city streets", image: popularRouteImageByCity.city },
  { id: "ca-yvr-toronto", code: "YYZ", originCode: "YVR", city: "Toronto", country: "Canada", imageAlt: "Toronto skyline with Lake Ontario", image: popularRouteImageByCity.city },
  { id: "ca-yvr-la", code: "LAX", originCode: "YVR", city: "Los Angeles", country: "United States", imageAlt: "Los Angeles skyline and palm trees", image: popularRouteImageByCity.city },
  { id: "ca-yul-paris", code: "CDG", originCode: "YUL", city: "Paris", country: "France", imageAlt: "Eiffel Tower above Paris streets", image: popularRouteImageByCity.paris },
  { id: "ca-yyc-toronto", code: "YYZ", originCode: "YYC", city: "Toronto", country: "Canada", imageAlt: "Toronto skyline with Lake Ontario", image: popularRouteImageByCity.city },
  { id: "ca-yvr-london", code: "LHR", originCode: "YVR", city: "London", country: "United Kingdom", imageAlt: "London skyline and historic landmarks", image: popularRouteImageByCity.london },
  { id: "ca-yyz-miami", code: "MIA", originCode: "YYZ", city: "Miami", country: "United States", imageAlt: "Miami Beach lifeguard tower and palms", image: popularRouteImageByCity.city },
  { id: "ca-yul-london", code: "LHR", originCode: "YUL", city: "London", country: "United Kingdom", imageAlt: "London skyline and historic landmarks", image: popularRouteImageByCity.london },
  { id: "ca-yyz-calgary", code: "YYC", originCode: "YYZ", city: "Calgary", country: "Canada", imageAlt: "Calgary skyline and prairie landscape", image: popularRouteImageByCity.city },
  { id: "ca-yvr-cancun", code: "CUN", originCode: "YVR", city: "Cancun", country: "Mexico", imageAlt: "White sand beach and turquoise water in Cancun", image: popularRouteImageByCity.city },
  { id: "ca-yyz-halifax", code: "YHZ", originCode: "YYZ", city: "Halifax", country: "Canada", imageAlt: "Halifax harbor and waterfront", image: popularRouteImageByCity.city },
]);
popularDestinationsByMarket.GLOBAL = [];
appendPopularDestinationRoutes("GLOBAL", [
  { id: "global-lhr-cdg", code: "CDG", originCode: "LHR", city: "Paris", country: "France", imageAlt: "Eiffel Tower above Paris streets", image: popularRouteImageByCity.paris },
  { id: "global-lhr-ams", code: "AMS", originCode: "LHR", city: "Amsterdam", country: "Netherlands", imageAlt: "Amsterdam canals and historic homes", image: popularRouteImageByCity.city },
  { id: "global-dxb-lhr", code: "LHR", originCode: "DXB", city: "London", country: "United Kingdom", imageAlt: "London skyline and historic landmarks", image: popularRouteImageByCity.london },
  { id: "global-dxb-bkk", code: "BKK", originCode: "DXB", city: "Bangkok", country: "Thailand", imageAlt: "Bangkok skyline and temples", image: popularRouteImageByCity.bangkok },
  { id: "global-sin-bkk", code: "BKK", originCode: "SIN", city: "Bangkok", country: "Thailand", imageAlt: "Bangkok skyline and temples", image: popularRouteImageByCity.bangkok },
  { id: "global-sin-dps", code: "DPS", originCode: "SIN", city: "Bali", country: "Indonesia", imageAlt: "Bali cliffs and tropical ocean", image: popularRouteImageByCity.city },
  { id: "global-gru-mad", code: "MAD", originCode: "GRU", city: "Madrid", country: "Spain", imageAlt: "Madrid streets and historic architecture", image: popularRouteImageByCity.city },
  { id: "global-gru-lis", code: "LIS", originCode: "GRU", city: "Lisbon", country: "Portugal", imageAlt: "Historic Lisbon streets and hills", image: popularRouteImageByCity.city },
  { id: "global-nbo-dxb", code: "DXB", originCode: "NBO", city: "Dubai", country: "United Arab Emirates", imageAlt: "Downtown Dubai skyline with Burj Khalifa", image: popularRouteImageByCity.dubai },
  { id: "global-los-lhr", code: "LHR", originCode: "LOS", city: "London", country: "United Kingdom", imageAlt: "London skyline and historic landmarks", image: popularRouteImageByCity.london },
  { id: "global-yyz-lhr", code: "LHR", originCode: "YYZ", city: "London", country: "United Kingdom", imageAlt: "London skyline and historic landmarks", image: popularRouteImageByCity.london },
  { id: "global-hnd-sin", code: "SIN", originCode: "HND", city: "Singapore", country: "Singapore", imageAlt: "Marina Bay skyline in Singapore at dusk", image: popularRouteImageByCity.city },
  { id: "global-jnb-lhr", code: "LHR", originCode: "JNB", city: "London", country: "United Kingdom", imageAlt: "London skyline and historic landmarks", image: popularRouteImageByCity.london },
  { id: "global-mex-mad", code: "MAD", originCode: "MEX", city: "Madrid", country: "Spain", imageAlt: "Madrid streets and historic architecture", image: popularRouteImageByCity.city },
  { id: "global-lim-mad", code: "MAD", originCode: "LIM", city: "Madrid", country: "Spain", imageAlt: "Madrid streets and historic architecture", image: popularRouteImageByCity.city },
  { id: "global-fra-dxb", code: "DXB", originCode: "FRA", city: "Dubai", country: "United Arab Emirates", imageAlt: "Downtown Dubai skyline with Burj Khalifa", image: popularRouteImageByCity.dubai },
]);
popularDestinationsByMarket.NEUTRAL = popularDestinationsByMarket.GLOBAL;

for (const [marketCode, destinations] of Object.entries(
  popularDestinationsByMarket,
)) {
  validateDestinationImages(
    `${marketCode} popular destinations`,
    destinations.map((destination) => ({
      ...destination,
      image: destination.image.startsWith("/")
        ? `https://kurioticket.com${destination.image}`
        : destination.image,
    })),
  );
}

export function getPopularDestinationsByRegion(
  regionCode?: string | null,
): MarketContentResolution<PopularDestination> {
  return resolveMarketContent(regionCode, popularDestinationsByMarket);
}

export function getPopularDestinationFareCandidatesByRegion(
  regionCode?: string | null,
): MarketContentResolution<PopularDestination> {
  const primaryResolution = getPopularDestinationsByRegion(regionCode);
  const candidateMarkets = getPopularDestinationCandidateMarketCodes(
    regionCode,
    primaryResolution.effectiveMarketCode,
  );
  const seenRoutes = new Set<string>();
  const items: PopularDestination[] = [];

  for (const marketCode of candidateMarkets) {
    for (const destination of popularDestinationsByMarket[marketCode] ?? []) {
      const routeKey = `${destination.id}:${destination.originCode}:${destination.code}`;

      if (seenRoutes.has(routeKey)) continue;

      seenRoutes.add(routeKey);
      items.push(destination);
    }
  }

  return {
    ...primaryResolution,
    items: items.length ? items : primaryResolution.items,
  };
}

function getPopularDestinationCandidateMarketCodes(
  regionCode: string | undefined | null,
  effectiveMarketCode: string,
) {
  const profile = resolveMarket(regionCode);
  const codes = [effectiveMarketCode];
  const regionalMarketCode = getRegionalBackupMarketCode(effectiveMarketCode);

  if (regionalMarketCode && regionalMarketCode !== effectiveMarketCode) {
    codes.push(regionalMarketCode);
  }

  if (effectiveMarketCode === "GLOBAL") {
    codes.push("GLOBAL");
  }

  return [...new Set(codes)].filter((code) => {
    if (profile.countryCode === "US") return true;

    return code !== "US";
  });
}

function getRegionalBackupMarketCode(marketCode: string) {
  if (["NG", "KE", "ZA"].includes(marketCode)) return "AFRICA";
  if (["GB", "DE"].includes(marketCode)) return "EUROPE";
  if (marketCode === "AE") return "MIDDLE_EAST";
  if (marketCode === "JP") return "ASIA";
  if (marketCode === "BR") return "LATIN_AMERICA";
  if (marketCode === "CANADA") return "CANADA";

  return undefined;
}

export function getPopularDestinationAllowlist() {
  return new Map(
    Object.values(popularDestinationsByMarket)
      .flat()
      .map((destination) => [
        destination.id,
        {
          code: destination.code,
          originCode: destination.originCode,
        },
      ]),
  );
}

export function getRegionalMarketCode(regionCode?: string | null) {
  return resolveMarket(regionCode).contentMarketCode;
}

function resolveMarketContent<T>(
  regionCode: string | undefined | null,
  contentByMarket: Record<string, T[]>,
): MarketContentResolution<T> {
  const marketProfile = resolveMarket(regionCode);
  const marketContent = contentByMarket[marketProfile.contentMarketCode];

  if (marketContent?.length) {
    return {
      requestedRegionCode: marketProfile.countryCode,
      effectiveMarketCode: marketProfile.contentMarketCode,
      fallbackLevel: marketProfile.fallbackLevel,
      fallbackUsed: marketProfile.fallbackLevel !== "exact-country",
      items: marketContent,
    };
  }

  const regionalMarketCode = getRegionalBackupMarketCode(
    marketProfile.contentMarketCode,
  );
  const regionalContent = regionalMarketCode
    ? contentByMarket[regionalMarketCode]
    : undefined;

  if (regionalMarketCode && regionalContent?.length) {
    return {
      requestedRegionCode: marketProfile.countryCode,
      effectiveMarketCode: regionalMarketCode,
      fallbackLevel: "regional",
      fallbackUsed: true,
      items: regionalContent,
    };
  }

  const globalContent = contentByMarket.GLOBAL;

  if (marketProfile.contentMarketCode === "GLOBAL" && globalContent?.length) {
    return {
      requestedRegionCode: marketProfile.countryCode,
      effectiveMarketCode: "GLOBAL",
      fallbackLevel: "global",
      fallbackUsed: true,
      items: globalContent,
    };
  }

  return {
    requestedRegionCode: marketProfile.countryCode,
    effectiveMarketCode: "NEUTRAL",
    fallbackLevel: "neutral",
    fallbackUsed: true,
    items: contentByMarket.NEUTRAL ?? [],
  };
}
