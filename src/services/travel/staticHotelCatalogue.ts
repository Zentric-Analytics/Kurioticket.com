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
};

const londonImage = "/images/premium/homepage/destinations/kurioticket-homepage-destination-london-tower-bridge-thames-001.jpg";
const parisImage = "/images/premium/homepage/destinations/kurioticket-homepage-destination-paris-eiffel-tower-buildings-001.jpg";
const newYorkImage = "/images/premium/homepage/destinations/kurioticket-homepage-destination-new-york-statue-liberty-skyline-001.jpg";
const hotelImage = "/images/premium/hotels/kurioticket-hotels-hero-bellboy-guest-arrival-lobby-001.jpg";

const common = {
  propertyType: "Hotel",
  currency: "USD" as const,
  lastReviewed: "2026-08-02",
  imageProvenance: "Kurioticket approved repository asset",
  accessibility: ["Accessibility features should be confirmed directly with the property"],
};

export const staticHotelCatalogue: readonly StaticHotelRecord[] = [
  { ...common, id:"the-savoy-london",slug:"the-savoy-london",name:"The Savoy",city:"London",country:"United Kingdom",region:"England",aliases:["london","lon","united kingdom","uk","england"],location:"Strand, London",latitude:51.5104,longitude:-0.1208,neighbourhood:"Covent Garden",classificationStars:5,amenities:["Wi-Fi","Concierge","Fitness centre","Indoor pool"],imageUrl:londonImage,roomSummary:"Classic room options",bedSummary:"Bed configuration varies by room",description:"A landmark hotel on the Strand, well placed for the West End and the River Thames.",indicativeNightlyPrice:760,searchTags:["central","west end","luxury"],interestTags:["culture","dining"],familySuitable:true,businessSuitable:true },
  { ...common, id:"park-plaza-westminster-bridge",slug:"park-plaza-westminster-bridge",name:"Park Plaza Westminster Bridge London",city:"London",country:"United Kingdom",region:"England",aliases:["london","lon","united kingdom","uk","england"],location:"Westminster Bridge Road, London",latitude:51.501,longitude:-0.1167,neighbourhood:"South Bank",classificationStars:4,amenities:["Wi-Fi","Fitness centre","Indoor pool","Restaurant"],imageUrl:londonImage,roomSummary:"Guest room and studio options",bedSummary:"Bed configuration varies by room",description:"A South Bank property near Westminster Bridge and major central London sights.",indicativeNightlyPrice:290,searchTags:["south bank","westminster","family"],interestTags:["sightseeing","culture"],familySuitable:true,businessSuitable:true },
  { ...common, id:"hotel-le-six-paris",slug:"hotel-le-six-paris",name:"Hôtel Le Six",city:"Paris",country:"France",region:"Île-de-France",aliases:["paris","par","france","ile de france","île-de-france"],location:"Rue Stanislas, Paris",latitude:48.843,longitude:2.327,neighbourhood:"Montparnasse",classificationStars:4,amenities:["Wi-Fi","Spa","Bar","Breakfast available"],imageUrl:parisImage,roomSummary:"Classic and superior room options",bedSummary:"Bed configuration varies by room",description:"A boutique property in Montparnasse with convenient access to the Left Bank.",indicativeNightlyPrice:260,searchTags:["left bank","montparnasse","boutique"],interestTags:["culture","dining"],familySuitable:true,businessSuitable:true },
  { ...common, id:"citizenm-paris-gare-de-lyon",slug:"citizenm-paris-gare-de-lyon",name:"citizenM Paris Gare de Lyon",city:"Paris",country:"France",region:"Île-de-France",aliases:["paris","par","france","ile de france","île-de-france"],location:"Rue de Lyon, Paris",latitude:48.8457,longitude:2.3726,neighbourhood:"Gare de Lyon",classificationStars:4,amenities:["Wi-Fi","Restaurant","Bar","Workspaces"],imageUrl:parisImage,roomSummary:"Compact modern room options",bedSummary:"Large bed configuration",description:"A modern hotel near Gare de Lyon designed for efficient city stays.",indicativeNightlyPrice:210,searchTags:["gare de lyon","modern","transit"],interestTags:["city break","business"],familySuitable:false,businessSuitable:true },
  { ...common, id:"arlo-midtown-new-york",slug:"arlo-midtown-new-york",name:"Arlo Midtown",city:"New York",country:"United States",region:"New York",aliases:["new york","nyc","new york city","united states","usa"],location:"West 38th Street, New York",latitude:40.7547,longitude:-73.9945,neighbourhood:"Midtown Manhattan",classificationStars:4,amenities:["Wi-Fi","Fitness centre","Restaurant","Terrace"],imageUrl:newYorkImage,roomSummary:"City room and suite options",bedSummary:"Bed configuration varies by room",description:"A Midtown Manhattan property within reach of Times Square and Hudson Yards.",indicativeNightlyPrice:280,searchTags:["midtown","manhattan","times square"],interestTags:["city break","business"],familySuitable:true,businessSuitable:true },
  { ...common, id:"pod-times-square",slug:"pod-times-square",name:"Pod Times Square",city:"New York",country:"United States",region:"New York",aliases:["new york","nyc","new york city","united states","usa"],location:"West 42nd Street, New York",latitude:40.758,longitude:-73.9934,neighbourhood:"Hell's Kitchen",classificationStars:3,amenities:["Wi-Fi","Restaurant","Bar","Luggage storage"],imageUrl:newYorkImage,roomSummary:"Compact room options",bedSummary:"Queen or bunk-bed configurations",description:"A compact city hotel near Times Square and the Theater District.",indicativeNightlyPrice:175,searchTags:["times square","theater district","value"],interestTags:["sightseeing","nightlife"],familySuitable:true,businessSuitable:false },
  { ...common, id:"hotel-gracery-shinjuku",slug:"hotel-gracery-shinjuku",name:"Hotel Gracery Shinjuku",city:"Tokyo",country:"Japan",region:"Kantō",aliases:["tokyo","tyo","japan","shinjuku"],location:"Kabukicho, Shinjuku, Tokyo",latitude:35.6952,longitude:139.7029,neighbourhood:"Shinjuku",classificationStars:4,amenities:["Wi-Fi","Restaurant","Concierge","Laundry service"],imageUrl:hotelImage,roomSummary:"Single, double and twin room options",bedSummary:"Bed configuration varies by room",description:"A central Shinjuku hotel with strong rail connections across Tokyo.",indicativeNightlyPrice:165,searchTags:["shinjuku","central","transit"],interestTags:["city break","shopping"],familySuitable:true,businessSuitable:true },
  { ...common, id:"shibuya-stream-excel-hotel-tokyu",slug:"shibuya-stream-excel-hotel-tokyu",name:"Shibuya Stream Hotel",city:"Tokyo",country:"Japan",region:"Kantō",aliases:["tokyo","tyo","japan","shibuya"],location:"Shibuya, Tokyo",latitude:35.657,longitude:139.7038,neighbourhood:"Shibuya",classificationStars:4,amenities:["Wi-Fi","Restaurant","Fitness centre","Laundry service"],imageUrl:hotelImage,roomSummary:"Modern city room options",bedSummary:"Bed configuration varies by room",description:"A contemporary property connected to the Shibuya district and transport network.",indicativeNightlyPrice:240,searchTags:["shibuya","modern","transit"],interestTags:["shopping","dining"],familySuitable:true,businessSuitable:true },
];

export const supportedStaticHotelDestinations = ["London", "Paris", "New York", "Tokyo"] as const;

