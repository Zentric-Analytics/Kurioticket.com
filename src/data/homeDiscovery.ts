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

const fallbackDiscovery: HomeDiscoveryItem[] = [
  {
    id: "fallback-nyc-lisbon",
    title: "Lisbon city break",
    originCity: "New York",
    originCode: "JFK",
    destinationCity: "Lisbon",
    destinationCode: "LIS",
    routeNote: "Sun-soaked streets, pastel facades, and Atlantic viewpoints.",
    priceFromUsd: 465,
    image:
      "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Tram and tiled buildings in Lisbon old town",
  },
  {
    id: "fallback-london-istanbul",
    title: "Istanbul culture mix",
    originCity: "London",
    originCode: "LHR",
    destinationCity: "Istanbul",
    destinationCode: "IST",
    routeNote: "Mosque skylines, bazaars, and Bosphorus waterfront evenings.",
    priceFromUsd: 274,
    image:
      "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Historic Istanbul skyline with domes and minarets",
  },
  {
    id: "fallback-dubai-singapore",
    title: "Singapore skyline getaway",
    originCity: "Dubai",
    originCode: "DXB",
    destinationCity: "Singapore",
    destinationCode: "SIN",
    routeNote: "Futuristic gardens, hawker food, and efficient city transit.",
    priceFromUsd: 512,
    image:
      "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Singapore Marina Bay skyline at dusk",
  },
  {
    id: "fallback-paris-athens",
    title: "Athens history hop",
    originCity: "Paris",
    originCode: "CDG",
    destinationCity: "Athens",
    destinationCode: "ATH",
    routeNote: "Ancient landmarks, rooftop views, and Mediterranean flavors.",
    priceFromUsd: 189,
    image:
      "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Acropolis hill and cityscape in Athens",
  },
  {
    id: "fallback-toronto-cancun",
    title: "Cancun beach escape",
    originCity: "Toronto",
    originCode: "YYZ",
    destinationCity: "Cancun",
    destinationCode: "CUN",
    routeNote: "Turquoise beaches and resort stays for easy warm-weather breaks.",
    priceFromUsd: 298,
    image:
      "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=900&q=80",
    imageAlt: "White-sand beach and turquoise sea in Cancun",
  },
  {
    id: "fallback-lax-tokyo",
    title: "Tokyo city pulse",
    originCity: "Los Angeles",
    originCode: "LAX",
    destinationCity: "Tokyo",
    destinationCode: "NRT",
    routeNote: "Neon districts, late-night eats, and world-class rail links.",
    priceFromUsd: 678,
    image:
      "https://images.unsplash.com/photo-1492571350019-22de08371fd3?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Tokyo skyline with Tokyo Tower at sunset",
  },
  {
    id: "fallback-sydney-bali",
    title: "Bali island reset",
    originCity: "Sydney",
    originCode: "SYD",
    destinationCity: "Bali",
    destinationCode: "DPS",
    routeNote: "Tropical villas, rice terraces, and surf-ready coastlines.",
    priceFromUsd: 342,
    image:
      "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Cliffside temple and ocean view in Bali",
  },
  {
    id: "fallback-fra-cape-town",
    title: "Cape Town adventure",
    originCity: "Frankfurt",
    originCode: "FRA",
    destinationCity: "Cape Town",
    destinationCode: "CPT",
    routeNote: "Table Mountain hikes, coastal drives, and vineyard day trips.",
    priceFromUsd: 629,
    image:
      "https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Table Mountain and city bowl in Cape Town",
  },
];

export const homeDiscoveryByRegion: Record<string, HomeDiscoveryItem[]> = {
  NG: [
    { id: "ng-los-lhr", title: "London business and weekend mix", originCity: "Lagos", originCode: "LOS", destinationCity: "London", destinationCode: "LHR", routeNote: "High-frequency long-haul route for work trips and leisure add-ons.", priceFromUsd: 535, image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80", imageAlt: "London skyline with Tower Bridge" },
    { id: "ng-los-dxb", title: "Dubai shopping stopover", originCity: "Lagos", originCode: "LOS", destinationCity: "Dubai", destinationCode: "DXB", routeNote: "Popular for retail breaks, family travel, and onward connections.", priceFromUsd: 498, image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=80", imageAlt: "Dubai skyline with Burj Khalifa" },
    { id: "ng-abv-acc", title: "Accra quick regional trip", originCity: "Abuja", originCode: "ABV", destinationCity: "Accra", destinationCode: "ACC", routeNote: "Short-haul regional route with efficient city-to-city access.", priceFromUsd: 205, image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=900&q=80", imageAlt: "Accra city avenue with modern skyline" },
    { id: "ng-los-nbo", title: "Nairobi safari gateway", originCity: "Lagos", originCode: "LOS", destinationCity: "Nairobi", destinationCode: "NBO", routeNote: "East Africa access for business hubs and safari extensions.", priceFromUsd: 372, image: "https://images.unsplash.com/photo-1596005554384-d293674c91d7?auto=format&fit=crop&w=900&q=80", imageAlt: "Nairobi skyline under blue sky" },
    { id: "ng-abv-jnb", title: "Johannesburg city break", originCity: "Abuja", originCode: "ABV", destinationCity: "Johannesburg", destinationCode: "JNB", routeNote: "Strong southbound connectivity for meetings and urban escapes.", priceFromUsd: 441, image: "https://images.unsplash.com/photo-1617906646395-405fc6b7f0e6?auto=format&fit=crop&w=900&q=80", imageAlt: "Johannesburg skyline at golden hour" },
    { id: "ng-los-ist", title: "Istanbul connector route", originCity: "Lagos", originCode: "LOS", destinationCity: "Istanbul", destinationCode: "IST", routeNote: "Great hub for Europe links with a vibrant city stopover.", priceFromUsd: 458, image: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=900&q=80", imageAlt: "Istanbul waterfront and historic skyline" },
    { id: "ng-abv-cdg", title: "Paris style escape", originCity: "Abuja", originCode: "ABV", destinationCity: "Paris", destinationCode: "CDG", routeNote: "Classic Europe route for fashion, museums, and food scenes.", priceFromUsd: 549, image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80", imageAlt: "Eiffel Tower and Paris rooftops" },
    { id: "ng-los-doh", title: "Doha premium transit", originCity: "Lagos", originCode: "LOS", destinationCity: "Doha", destinationCode: "DOH", routeNote: "Comfort-focused routing with smooth onward global connections.", priceFromUsd: 432, image: "https://images.unsplash.com/photo-1578895101408-1a36b834405b?auto=format&fit=crop&w=900&q=80", imageAlt: "Doha skyline with waterfront towers" },
  ],
  CA: [
    { id: "ca-yyz-yvr", title: "Vancouver west coast city trip", originCity: "Toronto", originCode: "YYZ", destinationCity: "Vancouver", destinationCode: "YVR", routeNote: "Coast-to-coast favorite for mountain views and urban food spots.", priceFromUsd: 184, image: "https://images.unsplash.com/photo-1560814304-4f05b62f0e99?auto=format&fit=crop&w=900&q=80", imageAlt: "Vancouver skyline with coastal mountains" },
    { id: "ca-yul-cdg", title: "Paris transatlantic classic", originCity: "Montreal", originCode: "YUL", destinationCity: "Paris", destinationCode: "CDG", routeNote: "Strong overnight options for quick Europe getaways.", priceFromUsd: 427, image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80", imageAlt: "Paris street and Eiffel Tower view" },
    { id: "ca-yyz-jfk", title: "New York short city hop", originCity: "Toronto", originCode: "YYZ", destinationCity: "New York", destinationCode: "JFK", routeNote: "Frequent departures for shopping, dining, and business days.", priceFromUsd: 162, image: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=900&q=80", imageAlt: "New York skyline from waterfront" },
    { id: "ca-yvr-lax", title: "Los Angeles sunshine route", originCity: "Vancouver", originCode: "YVR", destinationCity: "Los Angeles", destinationCode: "LAX", routeNote: "West coast favorite for beaches, entertainment, and short breaks.", priceFromUsd: 178, image: "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?auto=format&fit=crop&w=900&q=80", imageAlt: "Los Angeles downtown skyline at sunset" },
    { id: "ca-yyz-cun", title: "Cancun winter escape", originCity: "Toronto", originCode: "YYZ", destinationCity: "Cancun", destinationCode: "CUN", routeNote: "Reliable leisure route with nonstop options in peak season.", priceFromUsd: 298, image: "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=900&q=80", imageAlt: "Cancun beach with clear turquoise water" },
    { id: "ca-yyc-yhz", title: "Halifax harbor weekend", originCity: "Calgary", originCode: "YYC", destinationCity: "Halifax", destinationCode: "YHZ", routeNote: "Cross-country escape for seafood, waterfront walks, and history.", priceFromUsd: 236, image: "https://images.unsplash.com/photo-1553531889-56cc480ac5cb?auto=format&fit=crop&w=900&q=80", imageAlt: "Halifax harbor and waterfront boardwalk" },
    { id: "ca-yul-lhr", title: "London city and theatre trip", originCity: "Montreal", originCode: "YUL", destinationCity: "London", destinationCode: "LHR", routeNote: "Year-round long-haul with strong premium and economy coverage.", priceFromUsd: 459, image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80", imageAlt: "London cityscape and river Thames" },
    { id: "ca-yvr-sfo", title: "San Francisco tech-and-food run", originCity: "Vancouver", originCode: "YVR", destinationCity: "San Francisco", destinationCode: "SFO", routeNote: "Short west-coast corridor for conferences and city weekends.", priceFromUsd: 169, image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=900&q=80", imageAlt: "San Francisco skyline and bay" },
  ],
  GB: [
    { id: "gb-lhr-bcn", title: "Barcelona sun break", originCity: "London", originCode: "LHR", destinationCity: "Barcelona", destinationCode: "BCN", routeNote: "Quick weekend classic for tapas, beaches, and architecture.", priceFromUsd: 149, image: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=900&q=80", imageAlt: "Barcelona skyline and Sagrada Familia" },
    { id: "gb-man-fco", title: "Rome history weekend", originCity: "Manchester", originCode: "MAN", destinationCity: "Rome", destinationCode: "FCO", routeNote: "Easy city escape with iconic landmarks and piazza dining.", priceFromUsd: 168, image: "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=900&q=80", imageAlt: "Colosseum and Rome city streets" },
    { id: "gb-edi-ams", title: "Amsterdam canal trip", originCity: "Edinburgh", originCode: "EDI", destinationCity: "Amsterdam", destinationCode: "AMS", routeNote: "Short hop for canals, cycling routes, and museum stops.", priceFromUsd: 141, image: "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=900&q=80", imageAlt: "Amsterdam canal houses and bridges" },
    { id: "gb-lhr-cdg", title: "Paris rail-alternative flight", originCity: "London", originCode: "LHR", destinationCity: "Paris", destinationCode: "CDG", routeNote: "Fast and frequent links for fashion weekends and business travel.", priceFromUsd: 128, image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80", imageAlt: "Paris Eiffel Tower from city avenue" },
    { id: "gb-lhr-dxb", title: "Dubai luxury escape", originCity: "London", originCode: "LHR", destinationCity: "Dubai", destinationCode: "DXB", routeNote: "Strong long-haul demand for winter sun and premium cabins.", priceFromUsd: 389, image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=80", imageAlt: "Dubai Marina towers at twilight" },
    { id: "gb-man-jfk", title: "New York long-weekender", originCity: "Manchester", originCode: "MAN", destinationCity: "New York", destinationCode: "JFK", routeNote: "Direct transatlantic option for shopping, shows, and meetings.", priceFromUsd: 462, image: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=900&q=80", imageAlt: "New York Manhattan skyline at dusk" },
    { id: "gb-edi-dub", title: "Dublin short city break", originCity: "Edinburgh", originCode: "EDI", destinationCity: "Dublin", destinationCode: "DUB", routeNote: "Quick hop for pubs, live music, and walkable neighborhoods.", priceFromUsd: 92, image: "https://images.unsplash.com/photo-1503917988258-f87a78e3c995?auto=format&fit=crop&w=900&q=80", imageAlt: "Dublin riverside and city bridges" },
    { id: "gb-lhr-lis", title: "Lisbon hilltop getaway", originCity: "London", originCode: "LHR", destinationCity: "Lisbon", destinationCode: "LIS", routeNote: "Year-round sunshine route with food, tram rides, and viewpoints.", priceFromUsd: 157, image: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?auto=format&fit=crop&w=900&q=80", imageAlt: "Lisbon yellow tram on historic street" },
  ],
  US: [
    { id: "us-jfk-mia", title: "Miami beach weekend", originCity: "New York", originCode: "JFK", destinationCity: "Miami", destinationCode: "MIA", routeNote: "High-frequency nonstop route for warm-weather escapes.", priceFromUsd: 129, image: "https://images.unsplash.com/photo-1535498730771-e735b998cd64?auto=format&fit=crop&w=900&q=80", imageAlt: "Miami skyline and waterfront" },
    { id: "us-ord-las", title: "Las Vegas entertainment run", originCity: "Chicago", originCode: "ORD", destinationCity: "Las Vegas", destinationCode: "LAS", routeNote: "Popular for events, shows, and flexible weekend flights.", priceFromUsd: 154, image: "https://images.unsplash.com/photo-1507069803602-8f153bc4e0d2?auto=format&fit=crop&w=900&q=80", imageAlt: "Las Vegas Strip at night" },
    { id: "us-lax-sfo", title: "San Francisco quick corridor", originCity: "Los Angeles", originCode: "LAX", destinationCity: "San Francisco", destinationCode: "SFO", routeNote: "Short-haul business favorite with frequent daily schedules.", priceFromUsd: 109, image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=900&q=80", imageAlt: "San Francisco skyline by the bay" },
    { id: "us-atl-mco", title: "Orlando family getaway", originCity: "Atlanta", originCode: "ATL", destinationCity: "Orlando", destinationCode: "MCO", routeNote: "Theme-park route with family-friendly timing options.", priceFromUsd: 98, image: "https://images.unsplash.com/photo-1605723517503-3cadb5818a0a?auto=format&fit=crop&w=900&q=80", imageAlt: "Orlando skyline with lake and fountain" },
    { id: "us-dfw-sea", title: "Seattle coffee-and-nature trip", originCity: "Dallas", originCode: "DFW", destinationCity: "Seattle", destinationCode: "SEA", routeNote: "Great for urban food scenes and Pacific Northwest day trips.", priceFromUsd: 166, image: "https://images.unsplash.com/photo-1502175353174-a7a70e73b362?auto=format&fit=crop&w=900&q=80", imageAlt: "Seattle skyline with Space Needle" },
    { id: "us-jfk-lax", title: "Los Angeles coast-to-coast", originCity: "New York", originCode: "JFK", destinationCity: "Los Angeles", destinationCode: "LAX", routeNote: "Classic transcontinental route for work and leisure.", priceFromUsd: 239, image: "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?auto=format&fit=crop&w=900&q=80", imageAlt: "Los Angeles skyline at golden hour" },
    { id: "us-mia-cun", title: "Cancun short leisure hop", originCity: "Miami", originCode: "MIA", destinationCity: "Cancun", destinationCode: "CUN", routeNote: "Quick international route for beach resorts and long weekends.", priceFromUsd: 147, image: "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=900&q=80", imageAlt: "Cancun white sand coastline" },
    { id: "us-ord-mco", title: "Orlando nonstop value route", originCity: "Chicago", originCode: "ORD", destinationCity: "Orlando", destinationCode: "MCO", routeNote: "Reliable fares for family trips and school-break travel.", priceFromUsd: 121, image: "https://images.unsplash.com/photo-1605723517503-3cadb5818a0a?auto=format&fit=crop&w=900&q=80", imageAlt: "Orlando lake and downtown skyline" },
  ],
  fallback: fallbackDiscovery,
};

export function getHomeDiscoveryByRegion(regionCode?: string | null): HomeDiscoveryItem[] {
  if (!regionCode) return fallbackDiscovery;
  return homeDiscoveryByRegion[regionCode] ?? fallbackDiscovery;
}
