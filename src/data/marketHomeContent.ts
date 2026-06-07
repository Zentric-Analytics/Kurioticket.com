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
      imageAlt: "New York skyline and city streets",
      image:
        "https://images.pexels.com/photos/11182439/pexels-photo-11182439.jpeg?auto=compress&cs=tinysrgb&w=1600",
    },
    {
      id: "us-miami",
      code: "MIA",
      originCode: "BOS",
      city: "Miami",
      country: "United States",
      imageAlt: "Miami Beach lifeguard tower and palms",
      image:
        "https://images.unsplash.com/photo-1535498730771-e735b998cd64?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "us-las-vegas",
      code: "LAS",
      originCode: "ORD",
      city: "Las Vegas",
      country: "United States",
      imageAlt: "Las Vegas strip lights at night",
      image:
        "https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "us-los-angeles",
      code: "LAX",
      originCode: "JFK",
      city: "Los Angeles",
      country: "United States",
      imageAlt: "Los Angeles skyline and palm trees",
      image:
        "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?auto=format&fit=crop&w=1600&q=90",
    },
    {
      id: "us-london",
      code: "LHR",
      originCode: "JFK",
      city: "London",
      country: "United Kingdom",
      imageAlt: "London skyline and historic landmarks",
      image:
        "https://images.pexels.com/photos/33843218/pexels-photo-33843218.jpeg?auto=compress&cs=tinysrgb&w=1600",
    },
    {
      id: "us-paris",
      code: "CDG",
      originCode: "JFK",
      city: "Paris",
      country: "France",
      imageAlt: "Eiffel Tower above Paris streets",
      image:
        "https://images.pexels.com/photos/2082103/pexels-photo-2082103.jpeg?auto=compress&cs=tinysrgb&w=1600",
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
      image: addPopularImageSignature(item.image, item.id),
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

function addPopularImageSignature(_image: string, signature: string) {
  const photoId =
    cardImagePhotoIds[
      Math.abs(
        [...signature].reduce(
          (hash, character) => hash * 31 + character.charCodeAt(0),
          7,
        ),
      ) % cardImagePhotoIds.length
    ];

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
popularDestinationsByMarket.GLOBAL = [
  popularDestinationsByMarket.GB[0],
  popularDestinationsByMarket.GB[1],
  popularDestinationsByMarket.AE[3],
  popularDestinationsByMarket.JP[2],
  popularDestinationsByMarket.BR[3],
  popularDestinationsByMarket.NG[0],
];
popularDestinationsByMarket.NEUTRAL = popularDestinationsByMarket.GLOBAL;

for (const [marketCode, destinations] of Object.entries(
  popularDestinationsByMarket,
)) {
  validateDestinationImages(`${marketCode} popular destinations`, destinations);
}

export function getPopularDestinationsByRegion(
  regionCode?: string | null,
): MarketContentResolution<PopularDestination> {
  return resolveMarketContent(regionCode, popularDestinationsByMarket);
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

  const globalContent = contentByMarket.GLOBAL;

  if (globalContent?.length) {
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
