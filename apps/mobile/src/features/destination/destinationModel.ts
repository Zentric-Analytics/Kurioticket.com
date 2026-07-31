import type { ImageSourcePropType } from "react-native";

export type DestinationSlug = "paris" | "bali" | "santorini" | "new-york";

export interface DestinationSeason {
  range: string;
  description: string;
  recommended?: boolean;
}

export interface DestinationExperience {
  title: string;
  subtitle: string;
}

export interface DestinationDetail {
  slug: DestinationSlug;
  name: string;
  country: string;
  image: ImageSourcePropType;
  imageAsset: string;
  description: string;
  sampleFare: string;
  whyVisit: string;
  tags: readonly string[];
  currency: string;
  airports: readonly string[];
  seasons: readonly DestinationSeason[];
  experiences: readonly DestinationExperience[];
  nigeriaNotes: readonly string[];
}
