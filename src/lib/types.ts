export type TripType = "round-trip" | "one-way" | "multi-city";
export type CabinClass = "economy" | "premium-economy" | "business" | "first";
export type SortMode = "cheapest" | "best" | "fastest" | "stops";

export type FlightSearchParams = {
  tripType: TripType;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  travelers: number;
  cabinClass: CabinClass;
  sort?: SortMode;
  currency?: string;
};

export type HotelSearchParams = {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  sort?: "cheapest" | "best" | "rating" | "location";
};

export type Layover = {
  airport: string;
  duration: string;
  quality: "short" | "good" | "long" | "overnight" | "unknown";
};

export type FlightSegment = {
  originAirport: string;
  destinationAirport: string;
  departureTime: string;
  arrivalTime: string;
  airlineName?: string;
  flightNumber?: string;
};

export type FlightLeg = {
  direction: "outbound" | "return" | "leg";
  originAirport: string;
  destinationAirport: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  durationMinutes: number;
  stops: number;
  layovers: Layover[];
  segments: FlightSegment[];
};

export type NormalizedFlightResult = {
  id: string;
  provider: string;
  airlineName: string;
  airlineLogo?: string;
  flightNumber?: string;
  originAirport: string;
  destinationAirport: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  durationMinutes: number;
  stops: number;
  layovers: Layover[];
  legs?: FlightLeg[];
  cabinClass: string;
  baggageInfo: string;
  refundInfo: string;
  price: number;
  currency: string;
  bookingUrl: string;
  partnerRedirectUrl: string;
  valueScore: number;
  riskScore: number;
  comfortScore: number;
  travelConfidenceScore: number;
  travelEffortScore: number;
  recommendationReasons: string[];
  badges: string[];
  rawProviderReference?: unknown;
};

export type PublicFlightResult = Omit<
  NormalizedFlightResult,
  "rawProviderReference"
>;

export type NormalizedHotelResult = {
  id: string;
  provider: string;
  name: string;
  imageUrl?: string;
  rating: number;
  location: string;
  distanceFromCenter?: string;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  amenities: string[];
  roomType: string;
  cancellationInfo: string;
  bookingUrl: string;
  partnerRedirectUrl: string;
  valueScore: number;
  travelConfidenceScore: number;
  arrivalSuitabilityScore: number;
  recommendationReasons: string[];
  badges: string[];
  rawProviderReference?: unknown;
};

export type PublicHotelResult = Omit<
  NormalizedHotelResult,
  "rawProviderReference"
>;

export type ProviderErrorCategory =
  | "no_inventory"
  | "route_unavailable"
  | "timeout"
  | "network"
  | "auth"
  | "server"
  | "invalid_response"
  | "failed";

export type ProviderErrorReason =
  | "provider_no_inventory"
  | "provider_route_unavailable"
  | "provider_timeout"
  | "provider_network_error"
  | "provider_auth_error"
  | "provider_server_error"
  | "provider_invalid_response"
  | "provider_failed";

export type ProviderResult<T> = {
  provider: string;
  results: T[];
  status: "success" | "failed" | "skipped";
  latencyMs: number;
  error?: string;
  errorCategory?: ProviderErrorCategory;
  errorReason?: ProviderErrorReason;
};

export type AggregatedResult<T> = {
  results: T[];
  providerStatuses: ProviderResult<unknown>[];
  warnings: string[];
  servedFromFallback: boolean;
  latencyMs: number;
  unavailableMessage?: string;
};

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  summary: string;
  lastUpdated: string;
  sections: LegalSection[];
};
