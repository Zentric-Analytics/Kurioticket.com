import type { FlightLeg, PublicFlightResult, PublicHotelResult, HotelClassificationStars } from "@/lib/types";
import type { NormalizedCarResult } from "@/lib/cars/types";
import type { SandboxOffer } from "@/services/travel/kayakSandbox";

/** Map provider legs, never infer elapsed time from timezone-less local timestamps. */
export function kayakFlightCardModel(offer: SandboxOffer): PublicFlightResult | null {
  const source = offer.flightLegs;
  if (!source?.length || source.some(leg => !leg.segments.length)) return null;
  const legs: FlightLeg[] = source.map((leg, index) => ({
    direction: index === 0 ? "outbound" : "return",
    originAirport: leg.segments[0].origin,
    destinationAirport: leg.segments[leg.segments.length - 1].destination,
    departureTime: leg.segments[0].departure,
    arrivalTime: leg.segments[leg.segments.length - 1].arrival,
    duration: leg.durationMinutes === undefined ? "Duration not supplied" : `${Math.floor(leg.durationMinutes / 60)}h ${leg.durationMinutes % 60}m`,
    durationMinutes: leg.durationMinutes ?? 0,
    stops: Math.max(0, leg.segments.length - 1),
    layovers: leg.segments.slice(0, -1).map(segment => ({airport:segment.destination, duration:"Not supplied", quality:"unknown"})),
    segments: leg.segments.map(segment => ({originAirport:segment.origin, destinationAirport:segment.destination,
      departureTime:segment.departure, arrivalTime:segment.arrival, airlineName:segment.airline,
      flightNumber:segment.flightNumber, operatingCarrier:segment.operatingDisclosure ? {name:segment.operatingDisclosure} : undefined})),
  }));
  const first = source[0].segments[0];
  return {
    id: `kayak-sandbox:${offer.id}`, provider:"KAYAK sandbox", airlineName:first.airline,
    airlineLogo:first.airlineLogo, flightNumber:first.flightNumber,
    ...legs[0], legs, cabinClass:"Not supplied", baggageInfo:"Not supplied by provider",
    refundInfo:"Not supplied by provider", price:offer.price, currency:offer.currency,
    bookingUrl:offer.testUrl, partnerRedirectUrl:offer.testUrl,
    valueScore:0, riskScore:0, comfortScore:0, travelConfidenceScore:0, travelEffortScore:0,
    recommendationReasons:[], badges:[],
  };
}

export function kayakHotelCardModel(offer: SandboxOffer, nights: number): PublicHotelResult {
  return {id:`kayak-sandbox:${offer.id}`,provider:"KAYAK sandbox",name:offer.title,
    imageUrl:offer.images?.[0]?.url,imageUrls:offer.images?.map(image=>image.url),
    rating:0,classificationStars:offer.hotelStars && [1,2,3,4,5].includes(offer.hotelStars) ? offer.hotelStars as HotelClassificationStars : undefined,
    location:offer.details[0] || "Location not supplied",amenities:[],roomType:offer.description,
    cancellationInfo:"See supplied rate details",pricePerNight:offer.price/nights,totalPrice:offer.price,currency:offer.currency,
    bookingUrl:offer.testUrl,partnerRedirectUrl:offer.testUrl,valueScore:0,travelConfidenceScore:0,arrivalSuitabilityScore:0,
    recommendationReasons:[],badges:[],dataSource:"demo"};
}

export function kayakCarCardModel(offer: SandboxOffer, days: number, pickup: string): NormalizedCarResult {
  return {id:`kayak-sandbox:${offer.id}`,category:"economy",categoryLabel:offer.details[0] || "Category not supplied",
    modelName:offer.title,orSimilar:false,imageUrl:offer.images?.[0]?.url,imageAlt:offer.title,
    passengers:0,bags:0,doors:0,transmission:"automatic",airConditioning:false,fuelPolicy:"other",mileagePolicy:"limited",
    pickupType:"city-location",pickupLocation:pickup,returnLocation:pickup,shuttleRequired:false,
    rentalCompanyName:offer.details[1] || "Supplier not supplied",recommendationScore:0,requiredDocuments:[],includedItems:[],importantInformation:[],
    inventorySource:"kayak-sandbox",sandboxPresentation:{specs:offer.carSpecs || ["Specifications not supplied"],pickupLabel:"Search pickup"},
    offers:[{id:offer.id,bookingProviderName:offer.description,rentalCompanyName:offer.details[1] || "Supplier not supplied",
      currency:offer.currency,totalPrice:offer.priceBasis === "per day" ? offer.price*days : offer.price,
      pricePerDay:offer.priceBasis === "per day" ? offer.price : offer.price/days,
      taxesAndFeesIncluded:false,payAtPickup:false,freeCancellation:false,bookingUrl:offer.testUrl}]};
}
