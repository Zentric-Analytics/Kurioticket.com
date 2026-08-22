export type HotelRoomOption = {
  id: string;
  hotelId: string;
  name: string;
  bedConfiguration: string;
  features: string[];
  mealPlan: string;
  cancellationInfo: string;
  taxesAndFeesIncluded?: boolean;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  pricingKind: "indicative";
  availabilityKind: "planning";
};

export type StaticHotelRoomOption = Omit<
  HotelRoomOption,
  | "hotelId"
  | "pricePerNight"
  | "totalPrice"
  | "pricingKind"
  | "availabilityKind"
> & {
  indicativeNightlyPrice: number;
};
