import { validateDestinationImages } from "./destinationImageValidation";

export type HomeDiscoveryItem = {
  id: string;
  title: string;
  originCity: string;
  originCode: string;
  destinationCity: string;
  destinationCode: string;
  routeNote: string;
  priceFromUsd: number;
  image: string;
  imageAlt: string;
};

export type HomeDiscoveryFareCandidate = Omit<
  HomeDiscoveryItem,
  "priceFromUsd"
> & {
  regionCode: string;
  priority: number;
  enabled: boolean;
};

const fallbackDiscovery: HomeDiscoveryItem[] = [
  {
    id: "fallback-nyc-lis",
    title: "Lisbon city break",
    originCity: "New York",
    originCode: "JFK",
    destinationCity: "Lisbon",
    destinationCode: "LIS",
    routeNote: "Sun-soaked streets, pastel facades, and Atlantic viewpoints.",
    priceFromUsd: 465,
    image:
      "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Historic tram on a Lisbon hillside street",
  },
  {
    id: "fallback-lhr-ist",
    title: "Istanbul culture mix",
    originCity: "London",
    originCode: "LHR",
    destinationCity: "Istanbul",
    destinationCode: "IST",
    routeNote: "Mosque skylines, bazaars, and Bosphorus waterfront evenings.",
    priceFromUsd: 274,
    image:
      "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Istanbul skyline with domes and minarets",
  },
  {
    id: "fallback-dxb-sin",
    title: "Singapore skyline getaway",
    originCity: "Dubai",
    originCode: "DXB",
    destinationCity: "Singapore",
    destinationCode: "SIN",
    routeNote: "Futuristic gardens, hawker food, and efficient city transit.",
    priceFromUsd: 512,
    image:
      "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Marina Bay skyline in Singapore at dusk",
  },
  {
    id: "fallback-cdg-ath",
    title: "Athens history hop",
    originCity: "Paris",
    originCode: "CDG",
    destinationCity: "Athens",
    destinationCode: "ATH",
    routeNote: "Ancient landmarks, rooftop views, and Mediterranean flavors.",
    priceFromUsd: 189,
    image:
      "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Acropolis hill and Athens cityscape",
  },
  {
    id: "fallback-yyz-cun",
    title: "Cancun beach escape",
    originCity: "Toronto",
    originCode: "YYZ",
    destinationCity: "Cancun",
    destinationCode: "CUN",
    routeNote:
      "Turquoise beaches and resort stays for easy warm-weather breaks.",
    priceFromUsd: 298,
    image:
      "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "White sand beach and turquoise water in Cancun",
  },
  {
    id: "fallback-lax-tyo",
    title: "Tokyo city pulse",
    originCity: "Los Angeles",
    originCode: "LAX",
    destinationCity: "Tokyo",
    destinationCode: "NRT",
    routeNote: "Neon districts, late-night eats, and world-class rail links.",
    priceFromUsd: 678,
    image:
      "https://images.unsplash.com/photo-1492571350019-22de08371fd3?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Tokyo skyline with Tokyo Tower at sunset",
  },
  {
    id: "fallback-syd-dps",
    title: "Bali island reset",
    originCity: "Sydney",
    originCode: "SYD",
    destinationCity: "Bali",
    destinationCode: "DPS",
    routeNote: "Tropical villas, rice terraces, and surf-ready coastlines.",
    priceFromUsd: 342,
    image:
      "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Cliffside temple and ocean in Bali",
  },
  {
    id: "fallback-fra-cpt",
    title: "Cape Town adventure",
    originCity: "Frankfurt",
    originCode: "FRA",
    destinationCity: "Cape Town",
    destinationCode: "CPT",
    routeNote: "Table Mountain hikes, coastal drives, and vineyard day trips.",
    priceFromUsd: 629,
    image:
      "https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Cape Town city and Table Mountain",
  },
  {
    id: "fallback-sfo-hnl",
    title: "Honolulu island sunshine",
    originCity: "San Francisco",
    originCode: "SFO",
    destinationCity: "Honolulu",
    destinationCode: "HNL",
    routeNote: "Easy Pacific getaway with beach mornings and crater hikes.",
    priceFromUsd: 399,
    image:
      "https://images.unsplash.com/photo-1507878866276-a947ef722fee?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Waikiki beachfront in Honolulu",
  },
  {
    id: "fallback-mad-mrk",
    title: "Marrakech souk and riad stay",
    originCity: "Madrid",
    originCode: "MAD",
    destinationCity: "Marrakech",
    destinationCode: "RAK",
    routeNote: "Warm-weather medina escape with rooftop dining and markets.",
    priceFromUsd: 221,
    image:
      "https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Traditional architecture and market streets in Marrakech",
  },
  {
    id: "fallback-gru-lim",
    title: "Lima coastal food trip",
    originCity: "Sao Paulo",
    originCode: "GRU",
    destinationCity: "Lima",
    destinationCode: "LIM",
    routeNote: "Pacific views, world-class cuisine, and historic districts.",
    priceFromUsd: 287,
    image:
      "https://images.unsplash.com/photo-1531968455001-5c5272a41129?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Miraflores coastline and city skyline in Lima",
  },
  {
    id: "fallback-del-bkk",
    title: "Bangkok city energy",
    originCity: "Delhi",
    originCode: "DEL",
    destinationCity: "Bangkok",
    destinationCode: "BKK",
    routeNote: "Street-food hubs, temple visits, and lively night markets.",
    priceFromUsd: 244,
    image:
      "https://images.unsplash.com/photo-1563492065-1efb62f6f55d?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Bangkok skyline and river at sunset",
  },
  {
    id: "fallback-bom-kul",
    title: "Kuala Lumpur city towers trip",
    originCity: "Mumbai",
    originCode: "BOM",
    destinationCity: "Kuala Lumpur",
    destinationCode: "KUL",
    routeNote:
      "Food districts, skyline viewpoints, and rainforest day options.",
    priceFromUsd: 258,
    image:
      "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Petronas Towers and Kuala Lumpur skyline at dusk",
  },
  {
    id: "fallback-mex-sjo",
    title: "San Jose nature launch",
    originCity: "Mexico City",
    originCode: "MEX",
    destinationCity: "San Jose",
    destinationCode: "SJO",
    routeNote:
      "Easy entry for cloud forests, volcano parks, and coffee estates.",
    priceFromUsd: 233,
    image:
      "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "San Jose Costa Rica skyline with surrounding green hills",
  },
  {
    id: "fallback-icn-hkg",
    title: "Hong Kong harbor city break",
    originCity: "Seoul",
    originCode: "ICN",
    destinationCity: "Hong Kong",
    destinationCode: "HKG",
    routeNote: "Skyline ferries, market streets, and late-night dining scenes.",
    priceFromUsd: 219,
    image:
      "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Hong Kong skyline and Victoria Harbour at night",
  },
  {
    id: "fallback-jnb-znz",
    title: "Zanzibar island unwind",
    originCity: "Johannesburg",
    originCode: "JNB",
    destinationCity: "Zanzibar",
    destinationCode: "ZNZ",
    routeNote: "Indian Ocean beaches, Stone Town alleys, and diving reefs.",
    priceFromUsd: 286,
    image:
      "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Zanzibar beach with palm trees and turquoise water",
  },
];

export const homeDiscoveryByRegion: Record<string, HomeDiscoveryItem[]> = {
  NG: [
    {
      id: "ng-los-lhr",
      title: "London business and weekend mix",
      originCity: "Lagos",
      originCode: "LOS",
      destinationCity: "London",
      destinationCode: "LHR",
      routeNote:
        "High-frequency long-haul route for work trips and leisure add-ons.",
      priceFromUsd: 535,
      image:
        "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Tower Bridge and London skyline",
    },
    {
      id: "ng-los-dxb",
      title: "Dubai shopping stopover",
      originCity: "Lagos",
      originCode: "LOS",
      destinationCity: "Dubai",
      destinationCode: "DXB",
      routeNote:
        "Popular for retail breaks, family travel, and onward connections.",
      priceFromUsd: 498,
      image:
        "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Downtown Dubai skyline with Burj Khalifa",
    },
    {
      id: "ng-abv-acc",
      title: "Accra quick regional trip",
      originCity: "Abuja",
      originCode: "ABV",
      destinationCity: "Accra",
      destinationCode: "ACC",
      routeNote:
        "Short-haul regional route with efficient city-to-city access.",
      priceFromUsd: 205,
      image:
        "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "City traffic and skyline in Accra",
    },
    {
      id: "ng-los-nbo",
      title: "Nairobi safari gateway",
      originCity: "Lagos",
      originCode: "LOS",
      destinationCity: "Nairobi",
      destinationCode: "NBO",
      routeNote: "East Africa access for business hubs and safari extensions.",
      priceFromUsd: 372,
      image:
        "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Nairobi skyline with distant national park plains",
    },
    {
      id: "ng-abv-jnb",
      title: "Johannesburg city break",
      originCity: "Abuja",
      originCode: "ABV",
      destinationCity: "Johannesburg",
      destinationCode: "JNB",
      routeNote:
        "Strong southbound connectivity for meetings and urban escapes.",
      priceFromUsd: 441,
      image:
        "https://images.unsplash.com/photo-1604633193983-5ad0f0f9d4f8?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Johannesburg skyline at golden hour",
    },
    {
      id: "ng-los-ist",
      title: "Istanbul connector route",
      originCity: "Lagos",
      originCode: "LOS",
      destinationCity: "Istanbul",
      destinationCode: "IST",
      routeNote: "Great hub for Europe links with a vibrant city stopover.",
      priceFromUsd: 458,
      image:
        "https://images.pexels.com/photos/11540297/pexels-photo-11540297.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt:
        "Blue Mosque and Istanbul skyline under a clear travel-poster sky",
    },
    {
      id: "ng-abv-cdg",
      title: "Paris style escape",
      originCity: "Abuja",
      originCode: "ABV",
      destinationCity: "Paris",
      destinationCode: "CDG",
      routeNote: "Classic Europe route for fashion, museums, and food scenes.",
      priceFromUsd: 549,
      image:
        "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Eiffel Tower above Paris streets",
    },
    {
      id: "ng-los-doh",
      title: "Doha premium transit",
      originCity: "Lagos",
      originCode: "LOS",
      destinationCity: "Doha",
      destinationCode: "DOH",
      routeNote:
        "Comfort-focused routing with smooth onward global connections.",
      priceFromUsd: 432,
      image:
        "https://images.unsplash.com/photo-1578895101408-1a36b834405b?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Doha skyline and corniche waterfront",
    },
    {
      id: "ng-los-kig",
      title: "Kigali clean-city weekend",
      originCity: "Lagos",
      originCode: "LOS",
      destinationCity: "Kigali",
      destinationCode: "KGL",
      routeNote:
        "Rising regional hub with green hills and easy city navigation.",
      priceFromUsd: 315,
      image:
        "https://images.unsplash.com/photo-1626808642875-0aa545482dfb?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Kigali hillside neighborhoods and modern buildings",
    },
    {
      id: "ng-abv-cai",
      title: "Cairo heritage stop",
      originCity: "Abuja",
      originCode: "ABV",
      destinationCity: "Cairo",
      destinationCode: "CAI",
      routeNote:
        "Gateway for Nile history tours and bustling old-city markets.",
      priceFromUsd: 386,
      image:
        "https://images.unsplash.com/photo-1539650116574-75c0c6d73b77?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Cairo skyline with the Pyramids of Giza",
    },
    {
      id: "ng-los-add",
      title: "Addis Ababa east-africa link",
      originCity: "Lagos",
      originCode: "LOS",
      destinationCity: "Addis Ababa",
      destinationCode: "ADD",
      routeNote: "Major transfer point with growing dining and culture scenes.",
      priceFromUsd: 332,
      image:
        "https://images.unsplash.com/photo-1629309786717-9505f20599c2?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Addis Ababa cityscape in the Ethiopian highlands",
    },
    {
      id: "ng-abv-fco",
      title: "Rome landmark getaway",
      originCity: "Abuja",
      originCode: "ABV",
      destinationCity: "Rome",
      destinationCode: "FCO",
      routeNote: "European classic for ruins, piazzas, and relaxed evenings.",
      priceFromUsd: 517,
      image:
        "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "The Colosseum and city streets in Rome",
    },
    {
      id: "ng-los-nrt",
      title: "Tokyo long-haul city pulse",
      originCity: "Lagos",
      originCode: "LOS",
      destinationCity: "Tokyo",
      destinationCode: "NRT",
      routeNote:
        "Major Asia gateway with neon districts and efficient rail transit.",
      priceFromUsd: 712,
      image:
        "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Tokyo neon signs and Shibuya nightlife streets",
    },
    {
      id: "ng-abv-mad",
      title: "Madrid tapas and art run",
      originCity: "Abuja",
      originCode: "ABV",
      destinationCity: "Madrid",
      destinationCode: "MAD",
      routeNote:
        "Europe city break route for museums, boulevards, and late dinners.",
      priceFromUsd: 503,
      image:
        "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Madrid city skyline and historic rooftops at dusk",
    },
    {
      id: "ng-los-cpt",
      title: "Cape Town coastal adventure",
      originCity: "Lagos",
      originCode: "LOS",
      destinationCity: "Cape Town",
      destinationCode: "CPT",
      routeNote:
        "Scenic South Africa route with beaches, mountains, and vineyards.",
      priceFromUsd: 467,
      image:
        "https://images.pexels.com/photos/34069442/pexels-photo-34069442.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt:
        "Traveler looking across Cape Town from Table Mountain toward the ocean",
    },
    {
      id: "ng-abv-rob",
      title: "Monrovia regional seaside trip",
      originCity: "Abuja",
      originCode: "ABV",
      destinationCity: "Monrovia",
      destinationCode: "ROB",
      routeNote:
        "West African city break with Atlantic beaches and local markets.",
      priceFromUsd: 238,
      image:
        "https://images.unsplash.com/photo-1470004914212-05527e49370b?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Coastal city shoreline and palm-lined beach in Monrovia",
    },
  ],
  CA: [
    {
      id: "ca-yyz-yvr",
      title: "Vancouver west coast city trip",
      originCity: "Toronto",
      originCode: "YYZ",
      destinationCity: "Vancouver",
      destinationCode: "YVR",
      routeNote:
        "Coast-to-coast favorite for mountain views and urban food spots.",
      priceFromUsd: 184,
      image:
        "https://images.unsplash.com/photo-1560814304-4f05b62f0e99?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Vancouver skyline backed by coastal mountains",
    },
    {
      id: "ca-yul-cdg",
      title: "Paris transatlantic classic",
      originCity: "Montreal",
      originCode: "YUL",
      destinationCity: "Paris",
      destinationCode: "CDG",
      routeNote: "Strong overnight options for quick Europe getaways.",
      priceFromUsd: 427,
      image:
        "https://images.pexels.com/photos/532826/pexels-photo-532826.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt: "Eiffel Tower rising above Paris rooftops in bright daylight",
    },
    {
      id: "ca-yvr-lax",
      title: "Los Angeles sunshine route",
      originCity: "Vancouver",
      originCode: "YVR",
      destinationCity: "Los Angeles",
      destinationCode: "LAX",
      routeNote:
        "West coast favorite for beaches, entertainment, and short breaks.",
      priceFromUsd: 178,
      image:
        "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Downtown Los Angeles skyline at sunset",
    },
    {
      id: "ca-yyz-cun",
      title: "Cancun winter escape",
      originCity: "Toronto",
      originCode: "YYZ",
      destinationCity: "Cancun",
      destinationCode: "CUN",
      routeNote: "Reliable leisure route with nonstop options in peak season.",
      priceFromUsd: 298,
      image:
        "https://images.pexels.com/photos/27898572/pexels-photo-27898572.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt:
        "Cancun beach resort with thatched umbrellas and turquoise Caribbean water",
    },
    {
      id: "ca-yyc-yhz",
      title: "Halifax harbor weekend",
      originCity: "Calgary",
      originCode: "YYC",
      destinationCity: "Halifax",
      destinationCode: "YHZ",
      routeNote:
        "Cross-country escape for seafood, waterfront walks, and history.",
      priceFromUsd: 236,
      image:
        "https://images.unsplash.com/photo-1589483235122-0f3e21a7a0f7?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Halifax waterfront harbor and boardwalk",
    },
    {
      id: "ca-yul-lhr",
      title: "London city and theatre trip",
      originCity: "Montreal",
      originCode: "YUL",
      destinationCity: "London",
      destinationCode: "LHR",
      routeNote:
        "Year-round long-haul with strong premium and economy coverage.",
      priceFromUsd: 459,
      image:
        "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt: "Big Ben and Westminster Bridge in London on a bright day",
    },
    {
      id: "ca-yvr-sfo",
      title: "San Francisco tech-and-food run",
      originCity: "Vancouver",
      originCode: "YVR",
      destinationCity: "San Francisco",
      destinationCode: "SFO",
      routeNote: "Short west-coast corridor for conferences and city weekends.",
      priceFromUsd: 169,
      image:
        "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "San Francisco downtown skyline at dusk",
    },
    {
      id: "ca-yyz-mco",
      title: "Orlando family parks run",
      originCity: "Toronto",
      originCode: "YYZ",
      destinationCity: "Orlando",
      destinationCode: "MCO",
      routeNote: "Consistent family demand for theme parks and school breaks.",
      priceFromUsd: 214,
      image:
        "https://images.unsplash.com/photo-1597466599360-3b9775841aec?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Orlando resort area with lake at sunset",
    },
    {
      id: "ca-yeg-pvr",
      title: "Puerto Vallarta beach getaway",
      originCity: "Edmonton",
      originCode: "YEG",
      destinationCity: "Puerto Vallarta",
      destinationCode: "PVR",
      routeNote: "Winter sun route with Pacific beaches and old-town charm.",
      priceFromUsd: 289,
      image:
        "https://images.unsplash.com/photo-1665039400840-b6b2a5786fef?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Puerto Vallarta coastline and old town",
    },
    {
      id: "ca-yyz-hnl",
      title: "Honolulu long-haul island break",
      originCity: "Toronto",
      originCode: "YYZ",
      destinationCity: "Honolulu",
      destinationCode: "HNL",
      routeNote:
        "Premium leisure option for beaches, surfing, and island hikes.",
      priceFromUsd: 521,
      image:
        "https://images.pexels.com/photos/4327528/pexels-photo-4327528.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt:
        "Honolulu Waikiki beach with Diamond Head and bright blue water",
    },
    {
      id: "ca-yvr-nrt",
      title: "Tokyo Pacific gateway",
      originCity: "Vancouver",
      originCode: "YVR",
      destinationCity: "Tokyo",
      destinationCode: "NRT",
      routeNote:
        "Strong transpacific demand for food scenes and city exploration.",
      priceFromUsd: 603,
      image:
        "https://images.pexels.com/photos/27781680/pexels-photo-27781680.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt:
        "Tokyo Shibuya street glowing with Japanese neon signs at night",
    },
    {
      id: "ca-yhz-yyt",
      title: "St. John's Atlantic edge getaway",
      originCity: "Halifax",
      originCode: "YHZ",
      destinationCity: "St. John's",
      destinationCode: "YYT",
      routeNote:
        "Short eastern hop for colorful row houses and coastal trails.",
      priceFromUsd: 188,
      image:
        "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Colorful hillside houses in St. John's Newfoundland",
    },
    {
      id: "ca-yyz-san",
      title: "San Diego sun-and-surf trip",
      originCity: "Toronto",
      originCode: "YYZ",
      destinationCity: "San Diego",
      destinationCode: "SAN",
      routeNote:
        "Reliable cross-border route for beaches, parks, and harbor views.",
      priceFromUsd: 247,
      image:
        "https://images.unsplash.com/photo-1577083552431-6e5fd01988f1?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "San Diego bay skyline and marina",
    },
    {
      id: "ca-yul-ber",
      title: "Berlin culture city break",
      originCity: "Montreal",
      originCode: "YUL",
      destinationCity: "Berlin",
      destinationCode: "BER",
      routeNote:
        "Europe city route for galleries, history districts, and nightlife.",
      priceFromUsd: 483,
      image:
        "https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Berlin skyline with TV Tower and river",
    },
    {
      id: "ca-yyc-yyj",
      title: "Victoria harbor weekend",
      originCity: "Calgary",
      originCode: "YYC",
      destinationCity: "Victoria",
      destinationCode: "YYJ",
      routeNote:
        "West coast short break for gardens, harbor walks, and tea houses.",
      priceFromUsd: 172,
      image:
        "https://images.unsplash.com/photo-1600634999628-8b3f53b4604a?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Victoria inner harbor and parliament buildings at dusk",
    },
    {
      id: "ca-yvr-syd",
      title: "Sydney transpacific adventure",
      originCity: "Vancouver",
      originCode: "YVR",
      destinationCity: "Sydney",
      destinationCode: "SYD",
      routeNote:
        "Long-haul favorite for harbor landmarks and beach-side suburbs.",
      priceFromUsd: 744,
      image:
        "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Sydney Opera House and Harbour Bridge on sunny day",
    },
  ],
  GB: [
    {
      id: "gb-lhr-bcn",
      title: "Barcelona sun break",
      originCity: "London",
      originCode: "LHR",
      destinationCity: "Barcelona",
      destinationCode: "BCN",
      routeNote: "Quick weekend classic for tapas, beaches, and architecture.",
      priceFromUsd: 149,
      image:
        "https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt:
        "Sagrada Familia basilica towers above Barcelona in clear daylight",
    },
    {
      id: "gb-man-fco",
      title: "Rome history weekend",
      originCity: "Manchester",
      originCode: "MAN",
      destinationCity: "Rome",
      destinationCode: "FCO",
      routeNote: "Easy city escape with iconic landmarks and piazza dining.",
      priceFromUsd: 168,
      image:
        "https://images.pexels.com/photos/1797161/pexels-photo-1797161.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt: "Roman Colosseum arches in warm late-afternoon light",
    },
    {
      id: "gb-edi-ams",
      title: "Amsterdam canal trip",
      originCity: "Edinburgh",
      originCode: "EDI",
      destinationCity: "Amsterdam",
      destinationCode: "AMS",
      routeNote: "Short hop for canals, cycling routes, and museum stops.",
      priceFromUsd: 141,
      image:
        "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Canal houses and bridges in Amsterdam",
    },
    {
      id: "gb-lhr-cdg",
      title: "Paris rail-alternative flight",
      originCity: "London",
      originCode: "LHR",
      destinationCity: "Paris",
      destinationCode: "CDG",
      routeNote:
        "Fast and frequent links for fashion weekends and business travel.",
      priceFromUsd: 128,
      image:
        "https://images.pexels.com/photos/699466/pexels-photo-699466.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt:
        "Paris Seine riverfront with the Eiffel Tower glowing at sunset",
    },
    {
      id: "gb-lhr-dxb",
      title: "Dubai luxury escape",
      originCity: "London",
      originCode: "LHR",
      destinationCity: "Dubai",
      destinationCode: "DXB",
      routeNote: "Strong long-haul demand for winter sun and premium cabins.",
      priceFromUsd: 389,
      image:
        "https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt: "Burj Khalifa and Downtown Dubai skyline in clear daylight",
    },
    {
      id: "gb-man-jfk",
      title: "New York long-weekender",
      originCity: "Manchester",
      originCode: "MAN",
      destinationCity: "New York",
      destinationCode: "JFK",
      routeNote:
        "Direct transatlantic option for shopping, shows, and meetings.",
      priceFromUsd: 462,
      image:
        "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "New York Manhattan skyline at dusk",
    },
    {
      id: "gb-edi-dub",
      title: "Dublin short city break",
      originCity: "Edinburgh",
      originCode: "EDI",
      destinationCity: "Dublin",
      destinationCode: "DUB",
      routeNote: "Quick hop for pubs, live music, and walkable neighborhoods.",
      priceFromUsd: 92,
      image:
        "https://images.unsplash.com/photo-1518005068251-37900150dfca?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Dublin riverfront and bridges",
    },
    {
      id: "gb-lgw-ath",
      title: "Athens ruins and rooftop views",
      originCity: "London",
      originCode: "LGW",
      destinationCity: "Athens",
      destinationCode: "ATH",
      routeNote:
        "Mediterranean city break with heritage sites and cafe districts.",
      priceFromUsd: 171,
      image:
        "https://images.pexels.com/photos/772689/pexels-photo-772689.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt: "Acropolis ruins above Athens in bright Mediterranean daylight",
    },
    {
      id: "gb-man-ber",
      title: "Berlin art-and-nightlife weekend",
      originCity: "Manchester",
      originCode: "MAN",
      destinationCity: "Berlin",
      destinationCode: "BER",
      routeNote:
        "Strong city-break demand for galleries, history, and club culture.",
      priceFromUsd: 133,
      image:
        "https://images.pexels.com/photos/2570063/pexels-photo-2570063.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt: "Brandenburg Gate in Berlin under a clear blue sky",
    },
    {
      id: "gb-edi-kef",
      title: "Reykjavik northern lights launch",
      originCity: "Edinburgh",
      originCode: "EDI",
      destinationCity: "Reykjavik",
      destinationCode: "KEF",
      routeNote:
        "High-interest route for geothermal spas and winter aurora trips.",
      priceFromUsd: 214,
      image:
        "https://images.unsplash.com/photo-1476610182048-b716b8518aae?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Colorful rooftops in Reykjavik with surrounding mountains",
    },
    {
      id: "gb-lhr-vie",
      title: "Vienna cafe-and-palace weekend",
      originCity: "London",
      originCode: "LHR",
      destinationCity: "Vienna",
      destinationCode: "VIE",
      routeNote:
        "Comfortable city hop for classical music, coffee houses, and museums.",
      priceFromUsd: 162,
      image:
        "https://images.unsplash.com/photo-1516550893885-9857ac0c5551?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Vienna historic center and cathedral rooftops",
    },
    {
      id: "gb-man-fao",
      title: "Faro Algarve beach reset",
      originCity: "Manchester",
      originCode: "MAN",
      destinationCity: "Faro",
      destinationCode: "FAO",
      routeNote:
        "Warm-weather route for coastal towns, cliffs, and ocean swims.",
      priceFromUsd: 146,
      image:
        "https://images.unsplash.com/photo-1530845640344-3fcbe6f1db9f?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Algarve coastline cliffs and beach near Faro",
    },
    {
      id: "gb-edi-zrh",
      title: "Zurich lake-and-alps city break",
      originCity: "Edinburgh",
      originCode: "EDI",
      destinationCity: "Zurich",
      destinationCode: "ZRH",
      routeNote:
        "Swiss route for old-town walks and easy mountain train links.",
      priceFromUsd: 173,
      image:
        "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Zurich riverfront and old town buildings",
    },
    {
      id: "gb-lgw-mrk",
      title: "Marrakech medina weekend",
      originCity: "London",
      originCode: "LGW",
      destinationCity: "Marrakech",
      destinationCode: "RAK",
      routeNote:
        "Short-haul winter sun option with souks, riads, and rooftop dining.",
      priceFromUsd: 179,
      image:
        "https://images.pexels.com/photos/3889843/pexels-photo-3889843.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt:
        "Marrakech riad courtyard with ornate Moroccan tilework and palms",
    },
    {
      id: "gb-bhx-prg",
      title: "Prague old-town weekend",
      originCity: "Birmingham",
      originCode: "BHX",
      destinationCity: "Prague",
      destinationCode: "PRG",
      routeNote: "Affordable city-break route for bridges, castles, and cafes.",
      priceFromUsd: 137,
      image:
        "https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Prague old town and Charles Bridge over the river",
    },
    {
      id: "gb-man-otp",
      title: "Bucharest value city trip",
      originCity: "Manchester",
      originCode: "MAN",
      destinationCity: "Bucharest",
      destinationCode: "OTP",
      routeNote:
        "Emerging city route for architecture, nightlife, and food halls.",
      priceFromUsd: 129,
      image:
        "https://images.unsplash.com/photo-1629033193357-6f302ff628f6?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Bucharest city center boulevard and historic buildings",
    },
  ],
  US: [
    {
      id: "us-jfk-mia",
      title: "Miami beach weekend",
      originCity: "New York",
      originCode: "JFK",
      destinationCity: "Miami",
      destinationCode: "MIA",
      routeNote: "High-frequency nonstop route for warm-weather escapes.",
      priceFromUsd: 129,
      image:
        "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Downtown Miami skyline and Biscayne Bay waterfront",
    },
    {
      id: "us-ord-las",
      title: "Las Vegas entertainment run",
      originCity: "Chicago",
      originCode: "ORD",
      destinationCity: "Las Vegas",
      destinationCode: "LAS",
      routeNote: "Popular for events, shows, and flexible weekend flights.",
      priceFromUsd: 154,
      image:
        "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Las Vegas Strip and skyline illuminated at night",
    },
    {
      id: "us-lax-sfo",
      title: "San Francisco quick corridor",
      originCity: "Los Angeles",
      originCode: "LAX",
      destinationCity: "San Francisco",
      destinationCode: "SFO",
      routeNote: "Short-haul business favorite with frequent daily schedules.",
      priceFromUsd: 109,
      image:
        "https://images.pexels.com/photos/208745/pexels-photo-208745.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt: "Golden Gate Bridge in San Francisco under clear daylight",
    },
    {
      id: "us-atl-mco",
      title: "Orlando family getaway",
      originCity: "Atlanta",
      originCode: "ATL",
      destinationCity: "Orlando",
      destinationCode: "MCO",
      routeNote: "Theme-park route with family-friendly timing options.",
      priceFromUsd: 98,
      image:
        "https://images.pexels.com/photos/3411135/pexels-photo-3411135.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt: "Orlando theme-park castle and lake in bright sunshine",
    },
    {
      id: "us-dfw-sea",
      title: "Seattle coffee-and-nature trip",
      originCity: "Dallas",
      originCode: "DFW",
      destinationCity: "Seattle",
      destinationCode: "SEA",
      routeNote: "Great for urban food scenes and Pacific Northwest day trips.",
      priceFromUsd: 166,
      image:
        "https://images.unsplash.com/photo-1502175353174-a7a70e73b362?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Seattle skyline with Space Needle",
    },
    {
      id: "us-mia-cun",
      title: "Cancun short leisure hop",
      originCity: "Miami",
      originCode: "MIA",
      destinationCity: "Cancun",
      destinationCode: "CUN",
      routeNote:
        "Quick international route for beach resorts and long weekends.",
      priceFromUsd: 147,
      image:
        "https://images.pexels.com/photos/35985284/pexels-photo-35985284.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt:
        "Bright Cancun shoreline with turquoise waves and beach umbrellas",
    },
    {
      id: "us-ord-pdx",
      title: "Portland food-and-forest weekend",
      originCity: "Chicago",
      originCode: "ORD",
      destinationCity: "Portland",
      destinationCode: "PDX",
      routeNote:
        "Pacific Northwest city break for coffee roasters, parks, and nearby waterfalls.",
      priceFromUsd: 176,
      image:
        "https://images.unsplash.com/photo-1477511801984-4ad318ed9846?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Portland skyline with bridges crossing the Willamette River",
    },
    {
      id: "us-sea-hnl",
      title: "Honolulu tropical break",
      originCity: "Seattle",
      originCode: "SEA",
      destinationCity: "Honolulu",
      destinationCode: "HNL",
      routeNote:
        "Direct island escape for beaches, surfing, and volcano views.",
      priceFromUsd: 267,
      image:
        "https://images.pexels.com/photos/161902/hawaii-beach-sand-ocean-161902.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt:
        "Sunny Oahu beach with palms and clear Pacific water near Honolulu",
    },
    {
      id: "us-bos-sju",
      title: "San Juan Caribbean long weekend",
      originCity: "Boston",
      originCode: "BOS",
      destinationCity: "San Juan",
      destinationCode: "SJU",
      routeNote:
        "Warm-weather US territory route with historic old town and beaches.",
      priceFromUsd: 203,
      image:
        "https://images.unsplash.com/photo-1602407294553-6ac9170b3ed0?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Colorful colonial buildings in Old San Juan",
    },
    {
      id: "us-den-phx",
      title: "Phoenix desert sun trip",
      originCity: "Denver",
      originCode: "DEN",
      destinationCity: "Phoenix",
      destinationCode: "PHX",
      routeNote:
        "Short western route for golf weekends and Sonoran desert hikes.",
      priceFromUsd: 117,
      image:
        "https://images.unsplash.com/photo-1675264671526-7fb10698431b?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Downtown Phoenix skyline with Camelback Mountain",
    },
    {
      id: "us-iad-bna",
      title: "Nashville music-city getaway",
      originCity: "Washington",
      originCode: "IAD",
      destinationCity: "Nashville",
      destinationCode: "BNA",
      routeNote:
        "High-demand domestic route for live music, food, and festivals.",
      priceFromUsd: 132,
      image:
        "https://images.unsplash.com/photo-1510771463146-e89e6e86560e?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Broadway and downtown Nashville skyline at dusk",
    },
    {
      id: "us-lax-yvr",
      title: "Vancouver mountain-and-city escape",
      originCity: "Los Angeles",
      originCode: "LAX",
      destinationCity: "Vancouver",
      destinationCode: "YVR",
      routeNote:
        "Easy cross-border route for harbor views, seafood, and nearby alpine trails.",
      priceFromUsd: 189,
      image:
        "https://images.pexels.com/photos/2382868/pexels-photo-2382868.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt:
        "Vancouver skyline and harbor backed by the North Shore mountains",
    },
    {
      id: "us-sea-anc",
      title: "Anchorage wilderness gateway",
      originCity: "Seattle",
      originCode: "SEA",
      destinationCity: "Anchorage",
      destinationCode: "ANC",
      routeNote:
        "Seasonal favorite for glacier views, wildlife tours, and hiking.",
      priceFromUsd: 221,
      image:
        "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Anchorage mountains and evergreen wilderness landscape",
    },
    {
      id: "us-jfk-aus",
      title: "Austin live-music city hop",
      originCity: "New York",
      originCode: "JFK",
      destinationCity: "Austin",
      destinationCode: "AUS",
      routeNote:
        "Popular domestic route for festivals, startups, and food trucks.",
      priceFromUsd: 173,
      image:
        "https://images.unsplash.com/photo-1531218150217-54595bc2b934?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "Austin skyline and Colorado River bridge at sunset",
    },
    {
      id: "us-dtw-msy",
      title: "New Orleans jazz weekend",
      originCity: "Detroit",
      originCode: "DTW",
      destinationCity: "New Orleans",
      destinationCode: "MSY",
      routeNote:
        "Culture-rich route for jazz clubs, Creole dining, and French Quarter nights.",
      priceFromUsd: 158,
      image:
        "https://images.unsplash.com/photo-1518391846015-55a9cc003b25?auto=format&fit=crop&w=1200&q=90",
      imageAlt: "New Orleans French Quarter street and balconies",
    },
    {
      id: "us-phl-san",
      title: "San Diego coastal break",
      originCity: "Philadelphia",
      originCode: "PHL",
      destinationCity: "San Diego",
      destinationCode: "SAN",
      routeNote:
        "Cross-country escape with beaches, harbor cruises, and mild weather.",
      priceFromUsd: 264,
      image:
        "https://images.pexels.com/photos/3586966/pexels-photo-3586966.jpeg?auto=compress&cs=tinysrgb&w=1200",
      imageAlt: "San Diego waterfront skyline and marina on a sunny day",
    },
  ],
  fallback: fallbackDiscovery,
};

validateDestinationImages(
  "fallback home discovery destinations",
  fallbackDiscovery,
);
for (const [regionCode, destinations] of Object.entries(
  homeDiscoveryByRegion,
)) {
  validateDestinationImages(
    `${regionCode} home discovery destinations`,
    destinations,
  );
}

export type HomeDiscoveryRoute = {
  id: string;
  label?: string;
  originCode: string;
  destinationCode: string;
};

export const DEFAULT_HOME_DISCOVERY_REGION = "US";

const DEFAULT_HOME_DISCOVERY_FLIGHT_ROUTE_IDS = [
  "us-jfk-mia",
  "us-ord-las",
  "us-lax-sfo",
  "us-atl-mco",
  "us-dfw-sea",
  "us-mia-cun",
  "us-ord-pdx",
  "us-sea-hnl",
  "us-bos-sju",
  "us-den-phx",
  "us-iad-bna",
  "us-lax-yvr",
  "us-sea-anc",
  "us-jfk-aus",
  "us-dtw-msy",
  "us-phl-san",
] as const;

const DEFAULT_HOME_DISCOVERY_FLIGHT_ROUTE_ID_SET = new Set<string>(
  DEFAULT_HOME_DISCOVERY_FLIGHT_ROUTE_IDS,
);

const ADDITIONAL_US_DISCOVERY_FARE_CANDIDATES: HomeDiscoveryFareCandidate[] = [
  {
    id: "us-ewr-sav",
    regionCode: "US",
    originCity: "Newark",
    originCode: "EWR",
    destinationCity: "Savannah",
    destinationCode: "SAV",
    title: "Savannah historic squares escape",
    routeNote:
      "Southern weekend route for cobblestone walks, food, and riverfront stays.",
    priority: 17,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1609607847926-da4702f01fef?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Historic Savannah street shaded by oak trees",
  },
  {
    id: "us-bos-mia",
    regionCode: "US",
    originCity: "Boston",
    originCode: "BOS",
    destinationCity: "Miami",
    destinationCode: "MIA",
    title: "Miami winter-sun reset",
    routeNote:
      "Northeast-to-sunshine route for beaches, dining, and art districts.",
    priority: 18,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1535498730771-e735b998cd64?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Miami Beach lifeguard tower and palm trees",
  },
  {
    id: "us-lga-chs",
    regionCode: "US",
    originCity: "New York",
    originCode: "LGA",
    destinationCity: "Charleston",
    destinationCode: "CHS",
    title: "Charleston coastal food weekend",
    routeNote:
      "Low-country route for historic streets, seafood, and beach add-ons.",
    priority: 19,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1551251762-9f40b93d179e?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Colorful historic homes in Charleston",
  },
  {
    id: "us-den-slc",
    regionCode: "US",
    originCity: "Denver",
    originCode: "DEN",
    destinationCity: "Salt Lake City",
    destinationCode: "SLC",
    title: "Salt Lake mountain base",
    routeNote:
      "Short western hop for ski weekends, national parks, and downtown dining.",
    priority: 20,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Salt Lake City skyline with mountain backdrop",
  },
  {
    id: "us-iah-mex",
    regionCode: "US",
    originCity: "Houston",
    originCode: "IAH",
    destinationCity: "Mexico City",
    destinationCode: "MEX",
    title: "Mexico City culture weekend",
    routeNote:
      "Frequent cross-border route for museums, markets, and food neighborhoods.",
    priority: 21,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1518659526054-190340b32735?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Palacio de Bellas Artes in Mexico City",
  },
  {
    id: "us-lax-sjd",
    regionCode: "US",
    originCity: "Los Angeles",
    originCode: "LAX",
    destinationCity: "Los Cabos",
    destinationCode: "SJD",
    title: "Los Cabos beach quick trip",
    routeNote:
      "Easy Baja route for resort weekends, desert scenery, and sea views.",
    priority: 22,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1512813195386-6cf811ad3542?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Los Cabos rock arch and blue ocean",
  },
  {
    id: "us-ord-rsw",
    regionCode: "US",
    originCity: "Chicago",
    originCode: "ORD",
    destinationCity: "Fort Myers",
    destinationCode: "RSW",
    title: "Fort Myers gulf-coast break",
    routeNote:
      "Warm-weather route for barrier islands, beaches, and relaxed stays.",
    priority: 23,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Gulf Coast beach with white sand and blue water",
  },
  {
    id: "us-sea-san",
    regionCode: "US",
    originCity: "Seattle",
    originCode: "SEA",
    destinationCity: "San Diego",
    destinationCode: "SAN",
    title: "San Diego sunshine corridor",
    routeNote:
      "West Coast route for beaches, parks, harbor days, and mild-weather weekends.",
    priority: 24,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1535515717265-193f9c4f3f63?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "San Diego coastline and city skyline",
  },
  {
    id: "us-jfk-lax",
    regionCode: "US",
    originCity: "New York",
    originCode: "JFK",
    destinationCity: "Los Angeles",
    destinationCode: "LAX",
    title: "Los Angeles coast-to-coast link",
    routeNote:
      "Major transcontinental corridor for beach days, studios, and West Coast weekends.",
    priority: 25,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Los Angeles skyline and palm trees at sunset",
  },
  {
    id: "us-ewr-mco",
    regionCode: "US",
    originCity: "Newark",
    originCode: "EWR",
    destinationCity: "Orlando",
    destinationCode: "MCO",
    title: "Orlando theme-park getaway",
    routeNote:
      "High-demand family route for parks, resorts, and quick warm-weather breaks.",
    priority: 26,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1597466599360-3b9775841aec?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Orlando lakefront skyline with palm trees",
  },
  {
    id: "us-lga-fll",
    regionCode: "US",
    originCity: "New York",
    originCode: "LGA",
    destinationCity: "Fort Lauderdale",
    destinationCode: "FLL",
    title: "Fort Lauderdale beach run",
    routeNote:
      "Northeast-to-Florida corridor for beaches, cruises, and long weekends.",
    priority: 27,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1605723517503-3cadb5818a0c?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Fort Lauderdale beach and oceanfront high-rises",
  },
  {
    id: "us-bos-lax",
    regionCode: "US",
    originCity: "Boston",
    originCode: "BOS",
    destinationCity: "Los Angeles",
    destinationCode: "LAX",
    title: "Los Angeles nonstop escape",
    routeNote:
      "Busy coast-to-coast route for entertainment, beaches, and city breaks.",
    priority: 28,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Los Angeles hillside neighborhood at golden hour",
  },
  {
    id: "us-ord-mia",
    regionCode: "US",
    originCity: "Chicago",
    originCode: "ORD",
    destinationCity: "Miami",
    destinationCode: "MIA",
    title: "Miami lakefront-to-beach trip",
    routeNote:
      "Popular Midwest-to-sun route for beaches, nightlife, and cruise departures.",
    priority: 29,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Miami waterfront skyline with blue water",
  },
  {
    id: "us-atl-las",
    regionCode: "US",
    originCity: "Atlanta",
    originCode: "ATL",
    destinationCity: "Las Vegas",
    destinationCode: "LAS",
    title: "Las Vegas long-weekend corridor",
    routeNote:
      "Hub-to-leisure route for shows, dining, conventions, and desert side trips.",
    priority: 30,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Las Vegas Strip lights at night",
  },
  {
    id: "us-dfw-mco",
    regionCode: "US",
    originCity: "Dallas-Fort Worth",
    originCode: "DFW",
    destinationCity: "Orlando",
    destinationCode: "MCO",
    title: "Orlando family flight path",
    routeNote:
      "Large hub-to-theme-park route for resort stays and school-break trips.",
    priority: 31,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Orlando amusement ride lights after dark",
  },
  {
    id: "us-den-las",
    regionCode: "US",
    originCity: "Denver",
    originCode: "DEN",
    destinationCity: "Las Vegas",
    destinationCode: "LAS",
    title: "Vegas mountain-west hop",
    routeNote:
      "Short leisure corridor for entertainment weekends and desert getaways.",
    priority: 32,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Las Vegas boulevard and resort towers",
  },
  {
    id: "us-sfo-las",
    regionCode: "US",
    originCity: "San Francisco",
    originCode: "SFO",
    destinationCity: "Las Vegas",
    destinationCode: "LAS",
    title: "Las Vegas Bay Area break",
    routeNote:
      "Frequent West Coast route for shows, food, events, and desert sun.",
    priority: 33,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Desert road leading toward mountains near Las Vegas",
  },
  {
    id: "us-lax-hnl",
    regionCode: "US",
    originCity: "Los Angeles",
    originCode: "LAX",
    destinationCity: "Honolulu",
    destinationCode: "HNL",
    title: "Honolulu Pacific beach link",
    routeNote:
      "Heavy leisure route for Waikiki stays, island hikes, and warm ocean days.",
    priority: 34,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1542259009477-d625272157b7?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Honolulu beach with Diamond Head in the distance",
  },
  {
    id: "us-sfo-sea",
    regionCode: "US",
    originCity: "San Francisco",
    originCode: "SFO",
    destinationCity: "Seattle",
    destinationCode: "SEA",
    title: "Seattle Pacific Northwest hop",
    routeNote:
      "Short West Coast corridor for coffee, waterfronts, music, and meetings.",
    priority: 35,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1502175353174-a7a70e73b362?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Seattle skyline with Space Needle and Mount Rainier",
  },
  {
    id: "us-iad-mco",
    regionCode: "US",
    originCity: "Washington, DC",
    originCode: "IAD",
    destinationCity: "Orlando",
    destinationCode: "MCO",
    title: "Orlando capital-area escape",
    routeNote:
      "Reliable leisure route for theme parks, resorts, and sunny school breaks.",
    priority: 36,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Orlando resort pool and palm trees",
  },
  {
    id: "us-msp-rsw",
    regionCode: "US",
    originCity: "Minneapolis",
    originCode: "MSP",
    destinationCity: "Fort Myers",
    destinationCode: "RSW",
    title: "Fort Myers winter-sun route",
    routeNote:
      "Upper Midwest-to-Gulf route for beaches, islands, and warm-weather stays.",
    priority: 37,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Sunlit Gulf Coast waves rolling onto a sandy beach",
  },
  {
    id: "us-clt-mia",
    regionCode: "US",
    originCity: "Charlotte",
    originCode: "CLT",
    destinationCity: "Miami",
    destinationCode: "MIA",
    title: "Miami southeast hub link",
    routeNote:
      "Common southeast corridor for beaches, business, and Caribbean connections.",
    priority: 38,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Miami Beach boardwalk and oceanfront skyline",
  },
  {
    id: "us-dtw-fll",
    regionCode: "US",
    originCity: "Detroit",
    originCode: "DTW",
    destinationCity: "Fort Lauderdale",
    destinationCode: "FLL",
    title: "Fort Lauderdale Great Lakes escape",
    routeNote:
      "Popular Florida route for beach weekends, cruises, and winter sunshine.",
    priority: 39,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1520454974749-611b7248ffdb?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Fort Lauderdale canals and waterfront homes",
  },
  {
    id: "us-phl-mco",
    regionCode: "US",
    originCity: "Philadelphia",
    originCode: "PHL",
    destinationCity: "Orlando",
    destinationCode: "MCO",
    title: "Orlando Philadelphia family route",
    routeNote:
      "Northeast leisure route for theme parks, resorts, and sunshine breaks.",
    priority: 40,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Bright Florida resort pool with palm trees",
  },
  {
    id: "us-bwi-mco",
    regionCode: "US",
    originCity: "Baltimore",
    originCode: "BWI",
    destinationCity: "Orlando",
    destinationCode: "MCO",
    title: "Orlando Baltimore getaway",
    routeNote:
      "Frequent family route for park trips, weekend breaks, and resort stays.",
    priority: 41,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1542640244-7e672d6cef4e?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Orlando lake and palm-lined waterfront at sunset",
  },
  {
    id: "us-dfw-las",
    regionCode: "US",
    originCity: "Dallas-Fort Worth",
    originCode: "DFW",
    destinationCity: "Las Vegas",
    destinationCode: "LAS",
    title: "Vegas north Texas route",
    routeNote:
      "High-volume leisure and convention route for quick desert weekends.",
    priority: 42,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1524562865630-b991c6c2f261?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Las Vegas resort fountains and skyline",
  },
  {
    id: "us-jfk-cun",
    regionCode: "US",
    originCity: "New York",
    originCode: "JFK",
    destinationCity: "Cancun",
    destinationCode: "CUN",
    title: "Cancun Caribbean quick trip",
    routeNote:
      "Popular nonstop leisure route for beaches, resorts, and warm-water breaks.",
    priority: 43,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1510097467424-192d713fd8b2?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Cancun turquoise water and white-sand shoreline",
  },
  {
    id: "us-atl-cun",
    regionCode: "US",
    originCity: "Atlanta",
    originCode: "ATL",
    destinationCity: "Cancun",
    destinationCode: "CUN",
    title: "Cancun Atlanta leisure route",
    routeNote:
      "Hub-to-resort corridor for beach vacations and easy Caribbean coast breaks.",
    priority: 44,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1552074283-08c0e4d7f2fa?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Cancun resort coastline with turquoise water",
  },
  {
    id: "us-dfw-sjd",
    regionCode: "US",
    originCity: "Dallas-Fort Worth",
    originCode: "DFW",
    destinationCity: "Los Cabos",
    destinationCode: "SJD",
    title: "Los Cabos north Texas escape",
    routeNote:
      "Common resort route for Baja beaches, desert landscapes, and long weekends.",
    priority: 45,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1568402102990-bc541580b59f?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Los Cabos beach with desert cliffs and blue water",
  },
  {
    id: "us-ord-cun",
    regionCode: "US",
    originCity: "Chicago",
    originCode: "ORD",
    destinationCity: "Cancun",
    destinationCode: "CUN",
    title: "Cancun Midwest beach route",
    routeNote:
      "High-confidence leisure route for winter sun, resorts, and family trips.",
    priority: 46,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1552074285-9f6f8e3f9862?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Cancun beach with umbrellas and clear blue water",
  },
  {
    id: "us-jfk-sju",
    regionCode: "US",
    originCity: "New York",
    originCode: "JFK",
    destinationCity: "San Juan",
    destinationCode: "SJU",
    title: "San Juan Caribbean city break",
    routeNote:
      "Frequent leisure route for old-city streets, beaches, and island weekends.",
    priority: 47,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1589998059171-988d887df646?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Colorful buildings in Old San Juan",
  },
  {
    id: "us-lax-mex",
    regionCode: "US",
    originCity: "Los Angeles",
    originCode: "LAX",
    destinationCity: "Mexico City",
    destinationCode: "MEX",
    title: "Mexico City west-coast link",
    routeNote:
      "Major cross-border route for food, museums, neighborhoods, and events.",
    priority: 48,
    enabled: true,
    image:
      "https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Mexico City historic center and cathedral skyline",
  },
];

export const DEFAULT_HOME_DISCOVERY_ELIGIBLE_FLIGHT_ROUTE_COUNT =
  DEFAULT_HOME_DISCOVERY_FLIGHT_ROUTE_IDS.length +
  ADDITIONAL_US_DISCOVERY_FARE_CANDIDATES.length;

export const HOME_DISCOVERY_VISIBLE_CARD_COUNT = 16;

export function getHomeDiscoveryByRegion(
  regionCode?: string | null,
): HomeDiscoveryItem[] {
  if (!regionCode) return fallbackDiscovery;
  return homeDiscoveryByRegion[regionCode] ?? fallbackDiscovery;
}

export function getHomeDiscoveryFareCandidates(
  regionCode: string = DEFAULT_HOME_DISCOVERY_REGION,
): HomeDiscoveryFareCandidate[] {
  if (regionCode !== DEFAULT_HOME_DISCOVERY_REGION) return [];

  const visibleCandidates = getHomeDiscoveryByRegion(
    DEFAULT_HOME_DISCOVERY_REGION,
  )
    .map<HomeDiscoveryFareCandidate | undefined>((item, index) => {
      if (!DEFAULT_HOME_DISCOVERY_FLIGHT_ROUTE_ID_SET.has(item.id))
        return undefined;
      if (
        !isValidDiscoveryRouteCode(item.originCode) ||
        !isValidDiscoveryRouteCode(item.destinationCode)
      ) {
        return undefined;
      }

      return {
        id: item.id,
        regionCode: DEFAULT_HOME_DISCOVERY_REGION,
        title: item.title,
        originCity: item.originCity,
        originCode: item.originCode,
        destinationCity: item.destinationCity,
        destinationCode: item.destinationCode,
        routeNote: item.routeNote,
        image: item.image,
        imageAlt: item.imageAlt,
        priority: index + 1,
        enabled: true,
      };
    })
    .filter((candidate): candidate is HomeDiscoveryFareCandidate =>
      Boolean(candidate),
    );

  return [...visibleCandidates, ...ADDITIONAL_US_DISCOVERY_FARE_CANDIDATES]
    .filter(
      ({ enabled, originCode, destinationCode }) =>
        enabled &&
        isValidDiscoveryRouteCode(originCode) &&
        isValidDiscoveryRouteCode(destinationCode) &&
        originCode !== destinationCode,
    )
    .sort((first, second) => first.priority - second.priority);
}

export function getEligibleHomeDiscoveryFlightRoutes(
  regionCode: string = DEFAULT_HOME_DISCOVERY_REGION,
): HomeDiscoveryRoute[] {
  return getHomeDiscoveryFareCandidates(regionCode).map(
    ({ id, title, originCode, destinationCode }) => ({
      id,
      label: title,
      originCode,
      destinationCode,
    }),
  );
}

export function getDefaultHomeDiscoveryPriceRoutes(): HomeDiscoveryRoute[] {
  return getEligibleHomeDiscoveryFlightRoutes(DEFAULT_HOME_DISCOVERY_REGION);
}

export function getHomeDiscoveryRouteAllowlist(): Map<
  string,
  HomeDiscoveryRoute
> {
  const allowlist = new Map<string, HomeDiscoveryRoute>();

  for (const route of getEligibleHomeDiscoveryFlightRoutes(
    DEFAULT_HOME_DISCOVERY_REGION,
  )) {
    allowlist.set(route.id, route);
  }

  return allowlist;
}

function isValidDiscoveryRouteCode(value: string | undefined | null) {
  return /^[A-Z]{3}$/.test(value ?? "");
}
