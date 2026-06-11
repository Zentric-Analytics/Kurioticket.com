export const imageProducts = [
  "global",
  "flights",
  "hotels",
  "cars",
  "deals",
  "explore",
  "destinations",
] as const;

export const imageUsages = [
  "homepage-hero",
  "homepage-destination-card",
  "flight-route-card",
  "flight-inspiration-card",
  "hotel-destination-card",
  "hotel-result-provider",
  "hotel-result-fallback",
  "car-trip-style-card",
  "car-pickup-card",
  "deal-card",
  "explore-card",
  "destination-page-card",
  "recent-search-card",
  "fallback",
] as const;

export const imageSources = [
  "provider",
  "premium-stock",
  "owned",
  "pexels",
  "unsplash",
  "kiwi",
  "hotelbeds",
  "temporary",
] as const;

export const imageStatuses = [
  "provider-real",
  "premium-approved",
  "free-approved",
  "temporary",
  "replace-before-launch",
  "blocked",
] as const;

export type ImageProduct = (typeof imageProducts)[number];
export type ImageUsage = (typeof imageUsages)[number];
export type ImageSource = (typeof imageSources)[number];
export type ImageStatus = (typeof imageStatuses)[number];

export type ImageFocalPoint =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type RegisteredImage = {
  id: string;
  url: string;
  alt: string;
  product: ImageProduct;
  usage: ImageUsage | ImageUsage[];
  source: ImageSource;
  status: ImageStatus;
  sourcePage?: string;
  creator?: string;
  license?: string;
  licenseNotes?: string;
  pageSurfaces: string[];
  intendedSlot: string;
  cropNotes?: string;
  focalPoint?: ImageFocalPoint;
  desktopApproved: boolean;
  mobileApproved: boolean;
  launchCritical: boolean;
  notes?: string;
};
