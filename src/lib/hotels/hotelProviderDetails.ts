export type PublicHotelProviderDetails = {
  source: "KAYAK";
  overview?: {
    address?: string;
    countryCode?: string;
    place?: string[];
    policies?: string[];
    selfRated?: boolean;
  };
  reviews?: {
    sentiment?: string;
    quotes?: string[];
  };
  rate?: {
    roomName?: string;
    freeCancellation?: boolean;
    payLater?: boolean;
    bundledRate?: boolean;
    rateBreakdown?: string[];
    conditions?: string[];
  };
};
