export type PublicHotelProviderFact = {
  label: string;
  value: string;
};

export type PublicHotelProviderDetails = {
  source: "KAYAK";
  overview?: {
    address?: string;
    countryCode?: string;
    place?: PublicHotelProviderFact[];
    policies?: PublicHotelProviderFact[];
    selfRated?: boolean;
  };
  reviews?: {
    sentiment?: string;
    quotes?: PublicHotelProviderFact[];
  };
  rate?: {
    roomName?: string;
    freeCancellation?: boolean;
    payLater?: boolean;
    bundledRate?: boolean;
    rateBreakdown?: PublicHotelProviderFact[];
    conditions?: PublicHotelProviderFact[];
  };
};
