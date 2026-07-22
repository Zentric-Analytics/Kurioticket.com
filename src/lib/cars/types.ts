export type CarSearchParams = {
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  driverAge: string;
};

export type CarTransmission = "automatic" | "manual";
export type CarFuelPolicy = "full-to-full" | "same-to-same" | "other";
export type CarMileagePolicy = "unlimited" | "limited";
export type CarPickupType = "airport-counter" | "shuttle" | "city-location" | "meet-and-greet";
export type CarCategory = "mini" | "economy" | "compact" | "intermediate" | "full-size" | "suv" | "luxury" | "van";

export type CarOffer = {
  id: string;
  bookingProviderName: string;
  rentalCompanyName: string;
  currency: string;
  pricePerDay: number;
  totalPrice: number;
  taxesAndFeesIncluded: boolean;
  payAtPickup: boolean;
  freeCancellation: boolean;
  bookingUrl?: string;
};

export type NormalizedCarResult = {
  id: string;
  category: CarCategory;
  categoryLabel: string;
  modelName: string;
  orSimilar: boolean;
  imageUrl?: string;
  imageAlt: string;
  passengers: number;
  bags: number;
  doors: number;
  transmission: CarTransmission;
  airConditioning: boolean;
  fuelPolicy: CarFuelPolicy;
  mileagePolicy: CarMileagePolicy;
  limitedMileageKm?: number;
  pickupType: CarPickupType;
  pickupLocation: string;
  returnLocation: string;
  shuttleRequired: boolean;
  rentalCompanyName: string;
  supplierRating?: number;
  supplierReviewCount?: number;
  recommendationScore: number;
  depositAmount?: number;
  excessAmount?: number;
  minimumDriverAge?: number;
  requiredDocuments: string[];
  includedItems: string[];
  importantInformation: string[];
  pickupInstructions?: string;
  offers: CarOffer[];
  isDemo: boolean;
};

export type CarInventoryStatus = "available" | "unavailable" | "invalid-search";
export type CarResultsMode = "live" | "demo";
