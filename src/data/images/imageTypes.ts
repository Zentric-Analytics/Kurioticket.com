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
export type ImageVendor = "iStock" | "Adobe Stock" | "Shutterstock" | "Getty/iStock";
export type ImageDimensions = `${number} x ${number}`;

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

export const imageContentRoles = [
  "provider-real",
  "fallback-only",
  "marketing",
  "test-only",
  "recent-search-derived",
  "replacement-needed",
] as const;

export const imageProductionPriorities = [
  "p0-launch-critical",
  "p1-public-important",
  "p2-supporting",
  "p3-internal-or-test",
] as const;

export const imageMarketAudienceTypes = [
  "local",
  "outbound",
  "inbound",
  "global",
] as const;

export type ImageContentRole = (typeof imageContentRoles)[number];
export type ImageProductionPriority = (typeof imageProductionPriorities)[number];
export type ImageMarketAudience = (typeof imageMarketAudienceTypes)[number];
export type ImageMarketCode = Uppercase<string>;
export type ImageRegionCode = Lowercase<string>;
export type ImageLocaleCode = string;

export type ImageMarketScope = {
  /** ISO 3166-1 alpha-2 market code, for example US, BR, GH, KE, or ZA. */
  market?: ImageMarketCode;
  /** Stable regional fallback bucket, for example west-africa, latin-america, or global. */
  region?: ImageRegionCode;
  /** Optional BCP 47 locale when imagery has copy, cultural, or language-specific approval. */
  locale?: ImageLocaleCode;
  /** Whether the image sells local identity, outbound travel, inbound travel, or global trust. */
  audience?: ImageMarketAudience;
};

export type ImageClassification = {
  launchCritical: boolean;
  pageSurfaces: string[];
  intendedSlot: string;
  contentRole: ImageContentRole;
  productionPriority: ImageProductionPriority;
  premiumReplacementRequired: boolean;
  notes?: string;
};

export type RegisteredImage = ImageMarketScope & {
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
  vendor?: ImageVendor;
  collection?: string;
  stockFileId?: string;
  dimensions?: ImageDimensions;
  pageSurfaces: string[];
  intendedSlot: string;
  cropNotes?: string;
  focalPoint?: ImageFocalPoint;
  desktopApproved: boolean;
  mobileApproved: boolean;
  launchCritical: boolean;
  contentRole?: ImageContentRole;
  productionPriority?: ImageProductionPriority;
  premiumReplacementRequired?: boolean;
  notes?: string;
};

export type InventoriedImage = ImageMarketScope & ImageClassification & {
  id: string;
  url: string;
  product: ImageProduct;
  usage: ImageUsage | ImageUsage[];
  source: ImageSource;
  status: ImageStatus;
  sourceFiles: string[];
};

export type MarketImageRegistryEntry = RegisteredImage & Required<Pick<ImageMarketScope, "audience">>;

export type MarketImageRequest = {
  market?: ImageMarketCode;
  region?: ImageRegionCode;
  locale?: ImageLocaleCode;
  product: ImageProduct;
  usage: ImageUsage;
  audience?: ImageMarketAudience;
};

export type MarketImageResolutionLevel = "market" | "region" | "global";

export type MarketImageResolution = {
  image: MarketImageRegistryEntry;
  level: MarketImageResolutionLevel;
  requestedMarket?: ImageMarketCode;
  requestedRegion?: ImageRegionCode;
};
