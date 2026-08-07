import type { ImageSourcePropType } from "react-native";

export type DiscoveryAdventure = {
  id: string;
  title: string;
  originCode: string;
  destinationCode: string;
  image: ImageSourcePropType;
  imageAlt: string;
};

// The mobile homepage uses the same safe NG fallback market as its existing
// homepage route-card navigation. These are the website selector's current
// first eight image cards for that market; provider fares are intentionally
// omitted because the app has no equivalent homepage fare request.
export const discoveryAdventures: readonly DiscoveryAdventure[] = [
  {
    id: "ng-los-lhr",
    title: "London business and weekend mix",
    originCode: "LOS",
    destinationCode: "LHR",
    image: { uri: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=90" },
    imageAlt: "Tower Bridge and London skyline",
  },
  {
    id: "ng-los-dxb",
    title: "Dubai shopping stopover",
    originCode: "LOS",
    destinationCode: "DXB",
    image: { uri: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=90" },
    imageAlt: "Downtown Dubai skyline with Burj Khalifa",
  },
  {
    id: "ng-abv-acc",
    title: "Accra quick regional trip",
    originCode: "ABV",
    destinationCode: "ACC",
    image: { uri: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1200&q=90" },
    imageAlt: "City traffic and skyline in Accra",
  },
  {
    id: "ng-los-nbo",
    title: "Nairobi safari gateway",
    originCode: "LOS",
    destinationCode: "NBO",
    image: { uri: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=1200&q=90" },
    imageAlt: "Nairobi skyline with distant national park plains",
  },
  {
    id: "ng-abv-jnb",
    title: "Johannesburg city break",
    originCode: "ABV",
    destinationCode: "JNB",
    image: { uri: "https://images.unsplash.com/photo-1604633193983-5ad0f0f9d4f8?auto=format&fit=crop&w=1200&q=90" },
    imageAlt: "Johannesburg skyline at golden hour",
  },
  {
    id: "ng-los-ist",
    title: "Istanbul connector route",
    originCode: "LOS",
    destinationCode: "IST",
    image: { uri: "https://images.pexels.com/photos/11540297/pexels-photo-11540297.jpeg?auto=compress&cs=tinysrgb&w=1200" },
    imageAlt: "Blue Mosque and Istanbul skyline under a clear travel-poster sky",
  },
  {
    id: "ng-abv-cdg",
    title: "Paris style escape",
    originCode: "ABV",
    destinationCode: "CDG",
    image: { uri: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=90" },
    imageAlt: "Eiffel Tower above Paris streets",
  },
  {
    id: "ng-los-doh",
    title: "Doha premium transit",
    originCode: "LOS",
    destinationCode: "DOH",
    image: { uri: "https://images.unsplash.com/photo-1578895101408-1a36b834405b?auto=format&fit=crop&w=1200&q=90" },
    imageAlt: "Doha skyline and corniche waterfront",
  },
] as const;
