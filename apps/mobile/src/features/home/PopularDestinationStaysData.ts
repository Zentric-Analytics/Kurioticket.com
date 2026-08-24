import { destinationByUnambiguousName } from "../explore/destinationCatalogue";

export const popularDestinationStays = [
  {
    id: "ng-dubai",
    city: "Dubai",
    country: "United Arab Emirates",
    image: {
      uri: "https://images.pexels.com/photos/21765772/pexels-photo-21765772.jpeg?auto=compress&cs=tinysrgb&w=1600",
    },
  },
  {
    id: "ng-london",
    city: "London",
    country: "United Kingdom",
    image: {
      uri: "https://images.pexels.com/photos/33843218/pexels-photo-33843218.jpeg?auto=compress&cs=tinysrgb&w=1600",
    },
  },
  {
    id: "ng-johannesburg",
    city: "Johannesburg",
    country: "South Africa",
    image: {
      // Keep the web image bytes and crop, but version this native-only URL so
      // React Native does not reuse the stale response cached under the old URI.
      uri: "https://images.unsplash.com/photo-1604633193983-5ad0f0f9d4f8?auto=format&fit=crop&w=1600&q=90&v=2",
    },
  },
  {
    id: "ng-accra",
    city: "Accra",
    country: "Ghana",
    image: {
      uri: "https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1600&q=90",
    },
  },
  {
    id: "ng-nairobi",
    city: "Nairobi",
    country: "Kenya",
    image: {
      uri: "https://images.unsplash.com/photo-1611348586804-61bf6c080437?auto=format&fit=crop&w=1600&q=90",
    },
  },
  {
    id: "ng-istanbul",
    city: "Istanbul",
    country: "Türkiye",
    image: {
      uri: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1600&q=90",
    },
  },
  {
    id: "ng-paris",
    city: "Paris",
    country: "France",
    image: {
      uri: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=90",
    },
  },
] as const;

export type PopularDestinationStay = (typeof popularDestinationStays)[number];

/** Resolve a Home presentation card to the identity shared by Explore and Saved. */
export function resolvePopularDestinationStay(
  destination: { city: string },
) {
  return destinationByUnambiguousName(destination.city);
}
