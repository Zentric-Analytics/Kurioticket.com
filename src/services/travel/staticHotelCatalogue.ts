import type { StaticHotelRoomOption } from "@/lib/hotels/hotelRoomOptions";

export type StaticHotelRecord = {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  region: string;
  aliases: readonly string[];
  location: string;
  latitude: number;
  longitude: number;
  neighbourhood: string;
  propertyType: string;
  classificationStars: 1 | 2 | 3 | 4 | 5;
  amenities: readonly string[];
  imageUrl: string;
  imageUrls: readonly string[];
  imageProvenance: string;
  roomSummary: string;
  bedSummary: string;
  description: string;
  indicativeNightlyPrice: number;
  currency: "USD";
  lastReviewed: string;
  searchTags: readonly string[];
  interestTags: readonly string[];
  familySuitable: boolean;
  businessSuitable: boolean;
  accessibility: readonly string[];
  roomOptions: readonly StaticHotelRoomOption[];
};

const londonImage =
  "/images/premium/homepage/destinations/kurioticket-homepage-destination-london-tower-bridge-thames-001.jpg";
const parisImage =
  "/images/premium/homepage/destinations/kurioticket-homepage-destination-paris-eiffel-tower-buildings-001.jpg";
const newYorkImage =
  "/images/premium/homepage/destinations/kurioticket-homepage-destination-new-york-statue-liberty-skyline-001.jpg";
const hotelImage =
  "/images/premium/hotels/kurioticket-hotels-hero-bellboy-guest-arrival-lobby-001.jpg";

const staticHotelGalleryImages = [
  hotelImage,
  londonImage,
  parisImage,
  newYorkImage,
  "/images/premium/homepage/destinations/kurioticket-homepage-destination-miami-skyline-waterfront-001.jpg",
  "/images/premium/homepage/destinations/kurioticket-homepage-destination-las-vegas-strip-night-drone-001.jpg",
  "/images/premium/homepage/destinations/kurioticket-homepage-destination-los-angeles-palm-skyline-001.jpg",
  "/images/premium/homepage/kurioticket-homepage-hero-businesswoman-modern-city-luggage-001.jpg",
  "/images/premium/packages/kurioticket-packages-hero-tropical-resort-001.jpg",
  "/images/premium/cars/kurioticket-cars-hero-coastal-convertible-001.jpg",
] as const;

function buildStaticHotelGallery(primaryImage: string, hotelId: string) {
  const remainingImages = staticHotelGalleryImages.filter(
    (image) => image !== primaryImage,
  );
  const offset = [...hotelId].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  ) % remainingImages.length;
  const rotated = remainingImages.map(
    (_image, index, images) => images[(index + offset) % images.length]!,
  );

  return [primaryImage, ...rotated] as const;
}

const common = {
  propertyType: "Hotel",
  currency: "USD" as const,
  lastReviewed: "2026-08-02",
  imageProvenance: "Kurioticket approved repository asset",
  accessibility: [
    "Accessibility features should be confirmed directly with the property",
  ],
};

const planningRoom = ({
  hotelId,
  id,
  name,
  bedConfiguration,
  features,
  mealPlan,
  cancellationInfo,
  basePrice,
  multiplier = 1,
}: {
  hotelId: string;
  id: string;
  name: string;
  bedConfiguration: string;
  features: string[];
  mealPlan: string;
  cancellationInfo: string;
  basePrice: number;
  multiplier?: number;
}): StaticHotelRoomOption => ({
  id: `${hotelId}-${id}`,
  name,
  bedConfiguration,
  features,
  mealPlan,
  cancellationInfo,
  taxesAndFeesIncluded: undefined,
  indicativeNightlyPrice: Math.round(basePrice * multiplier),
  currency: "USD",
});

const staticHotelProperties: readonly StaticHotelRecord[] = [
  {
    ...common,
    id: "the-savoy-london",
    slug: "the-savoy-london",
    name: "The Savoy",
    city: "London",
    country: "United Kingdom",
    region: "England",
    aliases: ["london", "lon", "united kingdom", "uk", "england"],
    location: "Strand, London",
    latitude: 51.5104,
    longitude: -0.1208,
    neighbourhood: "Covent Garden",
    classificationStars: 5,
    amenities: ["Wi-Fi", "Concierge", "Fitness centre", "Indoor pool"],
    imageUrl: londonImage,
    imageUrls: buildStaticHotelGallery(londonImage, "the-savoy-london"),
    roomSummary: "Classic room options",
    bedSummary: "Bed configuration varies by room",
    description:
      "A landmark hotel on the Strand, well placed for the West End and the River Thames.",
    indicativeNightlyPrice: 760,
    roomOptions: [
      planningRoom({
        hotelId: "the-savoy-london",
        id: "room-only",
        name: "Classic room options — room-only estimate",
        bedConfiguration: "Bed configuration varies by room",
        features: ["Planning room category", "Wi-Fi"],
        mealPlan: "Room only",
        cancellationInfo:
          "Planning estimate only; final terms are not yet confirmed.",
        basePrice: 760,
      }),
      planningRoom({
        hotelId: "the-savoy-london",
        id: "breakfast",
        name: "Classic room options — breakfast estimate",
        bedConfiguration: "Bed configuration varies by room",
        features: ["Breakfast planning allowance", "Wi-Fi"],
        mealPlan: "Breakfast included in planning estimate",
        cancellationInfo:
          "Planning estimate only; final terms are not yet confirmed.",
        basePrice: 760,
        multiplier: 1.12,
      }),
      planningRoom({
        hotelId: "the-savoy-london",
        id: "flexible",
        name: "Classic room options — flexible estimate",
        bedConfiguration: "Bed configuration varies by room",
        features: ["Flexible planning terms", "Wi-Fi"],
        mealPlan: "Room only",
        cancellationInfo:
          "Flexible planning terms; final terms are not yet confirmed.",
        basePrice: 760,
        multiplier: 1.18,
      }),
    ],
    searchTags: ["central", "west end", "luxury"],
    interestTags: ["culture", "dining"],
    familySuitable: true,
    businessSuitable: true,
  },
  {
    ...common,
    id: "park-plaza-westminster-bridge",
    slug: "park-plaza-westminster-bridge",
    name: "Park Plaza Westminster Bridge London",
    city: "London",
    country: "United Kingdom",
    region: "England",
    aliases: ["london", "lon", "united kingdom", "uk", "england"],
    location: "200 Westminster Bridge Rd, Lambeth, London SE1 7UT",
    latitude: 51.501,
    longitude: -0.1167,
    neighbourhood: "South Bank",
    classificationStars: 4,
    amenities: ["Wi-Fi", "Fitness centre", "Indoor pool", "Restaurant"],
    imageUrl: londonImage,
    imageUrls: buildStaticHotelGallery(londonImage, "park-plaza-westminster-bridge"),
    roomSummary: "Guest room and studio options",
    bedSummary: "Bed configuration varies by room",
    description:
      "A South Bank property near Westminster Bridge and major central London sights.",
    indicativeNightlyPrice: 290,
    roomOptions: [
      planningRoom({
        hotelId: "park-plaza-westminster-bridge",
        id: "room-only",
        name: "Guest room and studio options — room-only estimate",
        bedConfiguration: "Bed configuration varies by room",
        features: ["Planning room category", "Wi-Fi"],
        mealPlan: "Room only",
        cancellationInfo:
          "Planning estimate only; final terms are not yet confirmed.",
        basePrice: 290,
      }),
      planningRoom({
        hotelId: "park-plaza-westminster-bridge",
        id: "breakfast",
        name: "Guest room and studio options — breakfast estimate",
        bedConfiguration: "Bed configuration varies by room",
        features: ["Breakfast planning allowance", "Wi-Fi"],
        mealPlan: "Breakfast included in planning estimate",
        cancellationInfo:
          "Planning estimate only; final terms are not yet confirmed.",
        basePrice: 290,
        multiplier: 1.12,
      }),
      planningRoom({
        hotelId: "park-plaza-westminster-bridge",
        id: "flexible",
        name: "Guest room and studio options — flexible estimate",
        bedConfiguration: "Bed configuration varies by room",
        features: ["Flexible planning terms", "Wi-Fi"],
        mealPlan: "Room only",
        cancellationInfo:
          "Flexible planning terms; final terms are not yet confirmed.",
        basePrice: 290,
        multiplier: 1.18,
      }),
    ],
    searchTags: ["south bank", "westminster", "family"],
    interestTags: ["sightseeing", "culture"],
    familySuitable: true,
    businessSuitable: true,
  },
  {
    ...common,
    id: "hotel-le-six-paris",
    slug: "hotel-le-six-paris",
    name: "Hôtel Le Six",
    city: "Paris",
    country: "France",
    region: "Île-de-France",
    aliases: ["paris", "par", "france", "ile de france", "île-de-france"],
    location: "Rue Stanislas, Paris",
    latitude: 48.843,
    longitude: 2.327,
    neighbourhood: "Montparnasse",
    classificationStars: 4,
    amenities: ["Wi-Fi", "Spa", "Bar", "Breakfast available"],
    imageUrl: parisImage,
    imageUrls: buildStaticHotelGallery(parisImage, "hotel-le-six-paris"),
    roomSummary: "Classic and superior room options",
    bedSummary: "Bed configuration varies by room",
    description:
      "A boutique property in Montparnasse with convenient access to the Left Bank.",
    indicativeNightlyPrice: 260,
    roomOptions: [
      planningRoom({
        hotelId: "hotel-le-six-paris",
        id: "room-only",
        name: "Classic and superior room options — room-only estimate",
        bedConfiguration: "Bed configuration varies by room",
        features: ["Planning room category", "Wi-Fi"],
        mealPlan: "Room only",
        cancellationInfo:
          "Planning estimate only; final terms are not yet confirmed.",
        basePrice: 260,
      }),
      planningRoom({
        hotelId: "hotel-le-six-paris",
        id: "breakfast",
        name: "Classic and superior room options — breakfast estimate",
        bedConfiguration: "Bed configuration varies by room",
        features: ["Breakfast planning allowance", "Wi-Fi"],
        mealPlan: "Breakfast included in planning estimate",
        cancellationInfo:
          "Planning estimate only; final terms are not yet confirmed.",
        basePrice: 260,
        multiplier: 1.12,
      }),
      planningRoom({
        hotelId: "hotel-le-six-paris",
        id: "flexible",
        name: "Classic and superior room options — flexible estimate",
        bedConfiguration: "Bed configuration varies by room",
        features: ["Flexible planning terms", "Wi-Fi"],
        mealPlan: "Room only",
        cancellationInfo:
          "Flexible planning terms; final terms are not yet confirmed.",
        basePrice: 260,
        multiplier: 1.18,
      }),
    ],
    searchTags: ["left bank", "montparnasse", "boutique"],
    interestTags: ["culture", "dining"],
    familySuitable: true,
    businessSuitable: true,
  },
  {
    ...common,
    id: "citizenm-paris-gare-de-lyon",
    slug: "citizenm-paris-gare-de-lyon",
    name: "citizenM Paris Gare de Lyon",
    city: "Paris",
    country: "France",
    region: "Île-de-France",
    aliases: ["paris", "par", "france", "ile de france", "île-de-france"],
    location: "Rue de Lyon, Paris",
    latitude: 48.8457,
    longitude: 2.3726,
    neighbourhood: "Gare de Lyon",
    classificationStars: 4,
    amenities: ["Wi-Fi", "Restaurant", "Bar", "Workspaces"],
    imageUrl: parisImage,
    imageUrls: buildStaticHotelGallery(parisImage, "citizenm-paris-gare-de-lyon"),
    roomSummary: "Compact modern room options",
    bedSummary: "Large bed configuration",
    description:
      "citizenM Paris Gare de Lyon offers stylish, tech-savvy rooms and a vibrant social atmosphere just steps away from Gare de Lyon. Perfect for travelers who want convenience, comfort and a modern stay in the heart of Paris.",
    indicativeNightlyPrice: 210,
    roomOptions: [
      planningRoom({
        hotelId: "citizenm-paris-gare-de-lyon",
        id: "room-only",
        name: "Compact modern room options — room-only estimate",
        bedConfiguration: "Large bed configuration",
        features: ["Planning room category", "Wi-Fi"],
        mealPlan: "Room only",
        cancellationInfo:
          "Planning estimate only; final terms are not yet confirmed.",
        basePrice: 210,
      }),
      planningRoom({
        hotelId: "citizenm-paris-gare-de-lyon",
        id: "breakfast",
        name: "Compact modern room options — breakfast estimate",
        bedConfiguration: "Large bed configuration",
        features: ["Breakfast planning allowance", "Wi-Fi"],
        mealPlan: "Breakfast included in planning estimate",
        cancellationInfo:
          "Planning estimate only; final terms are not yet confirmed.",
        basePrice: 210,
        multiplier: 1.12,
      }),
      planningRoom({
        hotelId: "citizenm-paris-gare-de-lyon",
        id: "flexible",
        name: "Compact modern room options — flexible estimate",
        bedConfiguration: "Large bed configuration",
        features: ["Flexible planning terms", "Wi-Fi"],
        mealPlan: "Room only",
        cancellationInfo:
          "Flexible planning terms; final terms are not yet confirmed.",
        basePrice: 210,
        multiplier: 1.18,
      }),
    ],
    searchTags: ["gare de lyon", "modern", "transit"],
    interestTags: ["city break", "business"],
    familySuitable: false,
    businessSuitable: true,
  },
  {
    ...common,
    id: "arlo-midtown-new-york",
    slug: "arlo-midtown-new-york",
    name: "Arlo Midtown",
    city: "New York",
    country: "United States",
    region: "New York",
    aliases: ["new york", "nyc", "new york city", "united states", "usa"],
    location: "West 38th Street, New York",
    latitude: 40.7547,
    longitude: -73.9945,
    neighbourhood: "Midtown Manhattan",
    classificationStars: 4,
    amenities: ["Wi-Fi", "Fitness centre", "Restaurant", "Terrace"],
    imageUrl: newYorkImage,
    imageUrls: buildStaticHotelGallery(newYorkImage, "arlo-midtown-new-york"),
    roomSummary: "City room and suite options",
    bedSummary: "Bed configuration varies by room",
    description:
      "A Midtown Manhattan property within reach of Times Square and Hudson Yards.",
    indicativeNightlyPrice: 280,
    roomOptions: [
      planningRoom({
        hotelId: "arlo-midtown-new-york",
        id: "room-only",
        name: "City room and suite options — room-only estimate",
        bedConfiguration: "Bed configuration varies by room",
        features: ["Planning room category", "Wi-Fi"],
        mealPlan: "Room only",
        cancellationInfo:
          "Planning estimate only; final terms are not yet confirmed.",
        basePrice: 280,
      }),
      planningRoom({
        hotelId: "arlo-midtown-new-york",
        id: "breakfast",
        name: "City room and suite options — breakfast estimate",
        bedConfiguration: "Bed configuration varies by room",
        features: ["Breakfast planning allowance", "Wi-Fi"],
        mealPlan: "Breakfast included in planning estimate",
        cancellationInfo:
          "Planning estimate only; final terms are not yet confirmed.",
        basePrice: 280,
        multiplier: 1.12,
      }),
      planningRoom({
        hotelId: "arlo-midtown-new-york",
        id: "flexible",
        name: "City room and suite options — flexible estimate",
        bedConfiguration: "Bed configuration varies by room",
        features: ["Flexible planning terms", "Wi-Fi"],
        mealPlan: "Room only",
        cancellationInfo:
          "Flexible planning terms; final terms are not yet confirmed.",
        basePrice: 280,
        multiplier: 1.18,
      }),
    ],
    searchTags: ["midtown", "manhattan", "times square"],
    interestTags: ["city break", "business"],
    familySuitable: true,
    businessSuitable: true,
  },
  {
    ...common,
    id: "pod-times-square",
    slug: "pod-times-square",
    name: "Pod Times Square",
    city: "New York",
    country: "United States",
    region: "New York",
    aliases: ["new york", "nyc", "new york city", "united states", "usa"],
    location: "West 42nd Street, New York",
    latitude: 40.758,
    longitude: -73.9934,
    neighbourhood: "Hell's Kitchen",
    classificationStars: 3,
    amenities: ["Wi-Fi", "Restaurant", "Bar", "Luggage storage"],
    imageUrl: newYorkImage,
    imageUrls: buildStaticHotelGallery(newYorkImage, "pod-times-square"),
    roomSummary: "Compact room options",
    bedSummary: "Queen or bunk-bed configurations",
    description:
      "A compact city hotel near Times Square and the Theater District.",
    indicativeNightlyPrice: 175,
    roomOptions: [
      planningRoom({
        hotelId: "pod-times-square",
        id: "room-only",
        name: "Compact room options — room-only estimate",
        bedConfiguration: "Queen or bunk-bed configurations",
        features: ["Planning room category", "Wi-Fi"],
        mealPlan: "Room only",
        cancellationInfo:
          "Planning estimate only; final terms are not yet confirmed.",
        basePrice: 175,
      }),
      planningRoom({
        hotelId: "pod-times-square",
        id: "breakfast",
        name: "Compact room options — breakfast estimate",
        bedConfiguration: "Queen or bunk-bed configurations",
        features: ["Breakfast planning allowance", "Wi-Fi"],
        mealPlan: "Breakfast included in planning estimate",
        cancellationInfo:
          "Planning estimate only; final terms are not yet confirmed.",
        basePrice: 175,
        multiplier: 1.12,
      }),
      planningRoom({
        hotelId: "pod-times-square",
        id: "flexible",
        name: "Compact room options — flexible estimate",
        bedConfiguration: "Queen or bunk-bed configurations",
        features: ["Flexible planning terms", "Wi-Fi"],
        mealPlan: "Room only",
        cancellationInfo:
          "Flexible planning terms; final terms are not yet confirmed.",
        basePrice: 175,
        multiplier: 1.18,
      }),
    ],
    searchTags: ["times square", "theater district", "value"],
    interestTags: ["sightseeing", "nightlife"],
    familySuitable: true,
    businessSuitable: false,
  },
  {
    ...common,
    id: "hotel-gracery-shinjuku",
    slug: "hotel-gracery-shinjuku",
    name: "Hotel Gracery Shinjuku",
    city: "Tokyo",
    country: "Japan",
    region: "Kantō",
    aliases: ["tokyo", "tyo", "japan", "shinjuku"],
    location: "Kabukicho, Shinjuku, Tokyo",
    latitude: 35.6952,
    longitude: 139.7029,
    neighbourhood: "Shinjuku",
    classificationStars: 4,
    amenities: ["Wi-Fi", "Restaurant", "Concierge", "Laundry service"],
    imageUrl: hotelImage,
    imageUrls: buildStaticHotelGallery(hotelImage, "hotel-gracery-shinjuku"),
    roomSummary: "Single, double and twin room options",
    bedSummary: "Bed configuration varies by room",
    description:
      "A central Shinjuku hotel with strong rail connections across Tokyo.",
    indicativeNightlyPrice: 165,
    roomOptions: [
      planningRoom({
        hotelId: "hotel-gracery-shinjuku",
        id: "room-only",
        name: "Single, double and twin room options — room-only estimate",
        bedConfiguration: "Bed configuration varies by room",
        features: ["Planning room category", "Wi-Fi"],
        mealPlan: "Room only",
        cancellationInfo:
          "Planning estimate only; final terms are not yet confirmed.",
        basePrice: 165,
      }),
      planningRoom({
        hotelId: "hotel-gracery-shinjuku",
        id: "breakfast",
        name: "Single, double and twin room options — breakfast estimate",
        bedConfiguration: "Bed configuration varies by room",
        features: ["Breakfast planning allowance", "Wi-Fi"],
        mealPlan: "Breakfast included in planning estimate",
        cancellationInfo:
          "Planning estimate only; final terms are not yet confirmed.",
        basePrice: 165,
        multiplier: 1.12,
      }),
      planningRoom({
        hotelId: "hotel-gracery-shinjuku",
        id: "flexible",
        name: "Single, double and twin room options — flexible estimate",
        bedConfiguration: "Bed configuration varies by room",
        features: ["Flexible planning terms", "Wi-Fi"],
        mealPlan: "Room only",
        cancellationInfo:
          "Flexible planning terms; final terms are not yet confirmed.",
        basePrice: 165,
        multiplier: 1.18,
      }),
    ],
    searchTags: ["shinjuku", "central", "transit"],
    interestTags: ["city break", "shopping"],
    familySuitable: true,
    businessSuitable: true,
  },
  {
    ...common,
    id: "shibuya-stream-excel-hotel-tokyu",
    slug: "shibuya-stream-excel-hotel-tokyu",
    name: "Shibuya Stream Hotel",
    city: "Tokyo",
    country: "Japan",
    region: "Kantō",
    aliases: ["tokyo", "tyo", "japan", "shibuya"],
    location: "Shibuya, Tokyo",
    latitude: 35.657,
    longitude: 139.7038,
    neighbourhood: "Shibuya",
    classificationStars: 4,
    amenities: ["Wi-Fi", "Restaurant", "Fitness centre", "Laundry service"],
    imageUrl: hotelImage,
    imageUrls: buildStaticHotelGallery(hotelImage, "shibuya-stream-excel-hotel-tokyu"),
    roomSummary: "Modern city room options",
    bedSummary: "Bed configuration varies by room",
    description:
      "A contemporary property connected to the Shibuya district and transport network.",
    indicativeNightlyPrice: 240,
    roomOptions: [
      planningRoom({
        hotelId: "shibuya-stream-excel-hotel-tokyu",
        id: "room-only",
        name: "Modern city room options — room-only estimate",
        bedConfiguration: "Bed configuration varies by room",
        features: ["Planning room category", "Wi-Fi"],
        mealPlan: "Room only",
        cancellationInfo:
          "Planning estimate only; final terms are not yet confirmed.",
        basePrice: 240,
      }),
      planningRoom({
        hotelId: "shibuya-stream-excel-hotel-tokyu",
        id: "breakfast",
        name: "Modern city room options — breakfast estimate",
        bedConfiguration: "Bed configuration varies by room",
        features: ["Breakfast planning allowance", "Wi-Fi"],
        mealPlan: "Breakfast included in planning estimate",
        cancellationInfo:
          "Planning estimate only; final terms are not yet confirmed.",
        basePrice: 240,
        multiplier: 1.12,
      }),
      planningRoom({
        hotelId: "shibuya-stream-excel-hotel-tokyu",
        id: "flexible",
        name: "Modern city room options — flexible estimate",
        bedConfiguration: "Bed configuration varies by room",
        features: ["Flexible planning terms", "Wi-Fi"],
        mealPlan: "Room only",
        cancellationInfo:
          "Flexible planning terms; final terms are not yet confirmed.",
        basePrice: 240,
        multiplier: 1.18,
      }),
    ],
    searchTags: ["shibuya", "modern", "transit"],
    interestTags: ["shopping", "dining"],
    familySuitable: true,
    businessSuitable: true,
  },
];

// Each property owns its planning room facts; the helper above only standardizes pricing metadata.
export const staticHotelCatalogue: readonly StaticHotelRecord[] =
  staticHotelProperties;

export const supportedStaticHotelDestinations = [
  "London",
  "Paris",
  "New York",
  "Tokyo",
] as const;
