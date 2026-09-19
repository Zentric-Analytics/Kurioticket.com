import type { FlightFareTerm, FlightLeg, NormalizedFlightResult, NormalizedHotelResult, HotelClassificationStars } from "@/lib/types";
import type { NormalizedCarResult } from "@/lib/cars/types";
import type { SandboxOffer } from "@/services/travel/kayakSandbox";
import type { PublicHotelProviderDetails, PublicHotelProviderFact } from "@/lib/hotels/hotelProviderDetails";

function providerValue(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function kayakFareTerms(offer: SandboxOffer): FlightFareTerm[] {
  if (offer.flightFareTerms) return offer.flightFareTerms;
  const terms: FlightFareTerm[] = [];
  if (offer.flightCarryOnIncluded !== undefined) terms.push({
    category: "baggage",
    semantic: offer.flightCarryOnIncluded ? "positive" : "informational",
    text: offer.flightCarryOnIncluded ? "Carry-on included" : "See supplied baggage details",
  });

  for (const attribute of offer.attributes ?? []) {
    if (!/^fees(?:\s|·|$)/i.test(attribute.label)) continue;
    const label = attribute.label.replace(/^fees\s*·?\s*/i, "").trim();
    if (!label || /bag number$/i.test(label)) continue;
    const value = providerValue(attribute.value);
    if (!value) continue;
    const text = `${label}: ${value}`;
    if (terms.some((term) => term.text.toLowerCase() === text.toLowerCase())) continue;
    const normalizedValue = value.toLowerCase();
    terms.push({
      category: /bag|baggage/i.test(label) ? "baggage" : "fare",
      semantic: /not included|not allowed|excluded/.test(normalizedValue)
        ? "negative"
        : /(^|\s)included($|\s)/.test(normalizedValue)
          ? "positive"
          : "informational",
      text,
    });
  }
  return terms;
}

function hotelAttributeFacts(offer: SandboxOffer, prefix: string): PublicHotelProviderFact[] {
  const pattern = new RegExp(`^${prefix}(?:\\s|·|$)`, "i");
  return (offer.attributes ?? [])
    .filter((attribute) => pattern.test(attribute.label))
    .map((attribute) => {
      const value = attribute.value.trim();
      const suffix = attribute.label.replace(pattern, "").replace(/^·\s*/, "").trim();
      return { label: providerValue(!suffix || /^\d+$/.test(suffix) ? prefix : suffix), value };
    })
    .filter((fact) => Boolean(fact.value));
}

function hotelAttributeValues(offer: SandboxOffer, prefix: string) {
  return hotelAttributeFacts(offer, prefix).map((fact) => fact.value);
}

function hotelAttributeValue(offer: SandboxOffer, prefix: string) {
  return hotelAttributeValues(offer, prefix)[0];
}

function hotelBooleanAttribute(offer: SandboxOffer, prefix: string) {
  const value = hotelAttributeValue(offer, prefix)?.toLowerCase();
  return value === "yes" ? true : value === "no" ? false : undefined;
}

function kayakHotelProviderDetails(offer: SandboxOffer): PublicHotelProviderDetails {
  const overview = {
    address: hotelAttributeValue(offer, "address"),
    countryCode: hotelAttributeValue(offer, "hotel Country Code"),
    place: hotelAttributeFacts(offer, "place"),
    policies: hotelAttributeFacts(offer, "policies"),
    selfRated: hotelBooleanAttribute(offer, "is Self Rated"),
  };
  const reviews = {
    sentiment: hotelAttributeValue(offer, "guest Rating Sentiment"),
    quotes: hotelAttributeFacts(offer, "review Quotes"),
  };
  const rate = {
    roomName: hotelAttributeValue(offer, "room Name") || offer.description || undefined,
    freeCancellation: hotelBooleanAttribute(offer, "has Free Cancellation"),
    payLater: hotelBooleanAttribute(offer, "can Pay Later"),
    bundledRate: hotelBooleanAttribute(offer, "is Bundled Rate"),
    rateBreakdown: hotelAttributeFacts(offer, "rate Breakdown"),
    conditions: hotelAttributeFacts(offer, "conditions"),
  };
  return {
    source: "KAYAK",
    ...(Object.values(overview).some((value) => Array.isArray(value) ? value.length : value !== undefined) ? { overview } : {}),
    ...(Object.values(reviews).some((value) => Array.isArray(value) ? value.length : value !== undefined) ? { reviews } : {}),
    ...(Object.values(rate).some((value) => Array.isArray(value) ? value.length : value !== undefined) ? { rate } : {}),
  };
}

/** Map provider legs, never infer elapsed time from timezone-less local timestamps. */
export function kayakFlightCardModel(offer: SandboxOffer, criteria: Record<string, string> = {}): NormalizedFlightResult | null {
  const source = offer.flightLegs;
  if (!source?.length || source.some(leg => !leg.segments.length)) return null;
  const legs: FlightLeg[] = source.map((leg, index) => ({
    direction: index === 0 ? "outbound" : "return",
    originAirport: leg.segments[0].origin,
    destinationAirport: leg.segments[leg.segments.length - 1].destination,
    departureTime: leg.segments[0].departure,
    arrivalTime: leg.segments[leg.segments.length - 1].arrival,
    duration: leg.durationMinutes === undefined ? "Duration not supplied" : `${Math.floor(leg.durationMinutes / 60)}h ${leg.durationMinutes % 60}m`,
    durationMinutes: leg.durationMinutes ?? Number.MAX_SAFE_INTEGER,
    stops: Math.max(0, leg.segments.length - 1),
    layovers: leg.segments.slice(0, -1).map(segment => ({airport:segment.destination, duration:"Not supplied", quality:"unknown"})),
    segments: leg.segments.map(segment => ({originAirport:segment.origin, destinationAirport:segment.destination,
      departureTime:segment.departure, arrivalTime:segment.arrival, airlineName:segment.airline,
      airlineLogo:segment.airlineLogo, flightNumber:segment.flightNumber, operatingCarrier:segment.operatingDisclosure ? {name:segment.operatingDisclosure} : undefined,
      ...(segment.cabinDetails ? {cabinDetails:[segment.cabinDetails]} : {})})),
  }));
  const first = source[0].segments[0];
  const travelers = Math.max(1, Number(criteria.adults || 1) + Number(criteria.children || 0) + Number(criteria.infants || 0));
  return {
    id: `kayak-sandbox:${offer.id}`, provider:"KAYAK sandbox", airlineName:first.airline,
    airlineLogo:first.airlineLogo, flightNumber:first.flightNumber,
    ...legs[0], legs, cabinClass:offer.flightCabin || "Not supplied", fareBrandName:offer.flightFareFamily,
    fareTerms: kayakFareTerms(offer),
    providerDetails: {
      price:{totalAmount:offer.price * (offer.priceBasis === "per person" ? travelers : 1),totalCurrency:offer.currency},
      ...(offer.flightConditions?.length ? {conditions:offer.flightConditions} : {}),
      ...(offer.flightOptionalServices?.length ? {optionalServices:offer.flightOptionalServices} : {}),
    },
    baggageInfo:offer.flightCarryOnIncluded === true ? "Carry-on included" : offer.flightCarryOnIncluded === false ? "See supplied baggage details" : "Baggage allowance not supplied by provider",
    refundInfo:"Not supplied by provider", price:offer.price * (offer.priceBasis === "per person" ? travelers : 1), currency:offer.currency,
    bookingUrl:offer.testUrl, partnerRedirectUrl:offer.testUrl, providerOfferId:offer.id,
    bookingProviderName:offer.bookingProviderName || offer.description || undefined,
    valueScore:0, riskScore:0, comfortScore:0, travelConfidenceScore:0, travelEffortScore:0,
    recommendationReasons:[], badges:[],
  };
}

export function kayakHotelCardModel(offer: SandboxOffer, nights: number): NormalizedHotelResult {
  const providerDetails = kayakHotelProviderDetails(offer);
  const freeCancellation = providerDetails.rate?.freeCancellation;
  return ({id:`kayak-sandbox:${offer.id}`,provider:"KAYAK sandbox",name:offer.title,
    imageUrl:offer.images?.[0]?.url,imageUrls:offer.images?.map(image=>image.url),
    rating:0,classificationStars:offer.hotelStars && [1,2,3,4,5].includes(offer.hotelStars) ? offer.hotelStars as HotelClassificationStars : undefined,
    reviewScore:offer.hotelReviewScore,reviewScale:offer.hotelReviewScore === undefined ? undefined : 10,
    reviewCount:offer.hotelReviewCount,reviewSource:offer.hotelReviewScore === undefined ? undefined : "KAYAK",
    location:offer.details[0] || providerDetails.overview?.address || "Location not supplied",amenities:offer.amenities || [],roomType:providerDetails.rate?.roomName || offer.description,
    cancellationInfo:freeCancellation === true ? "Free cancellation" : freeCancellation === false ? "Cancellation conditions apply" : "See supplied rate details",
    pricePerNight:offer.price/nights,totalPrice:offer.price,currency:offer.currency,
    bookingUrl:offer.testUrl,partnerRedirectUrl:offer.testUrl,valueScore:0,travelConfidenceScore:0,arrivalSuitabilityScore:0,
    recommendationReasons:[],badges:[],dataSource:"demo",providerDetails,
    rawProviderReference:{
      kind:"kayak-hotel-details",
      details:providerDetails,
      ...(offer.hotelLocation ? { location: offer.hotelLocation } : {}),
    }} as NormalizedHotelResult & { providerDetails: PublicHotelProviderDetails });
}

export function kayakCarCardModel(offer: SandboxOffer, days: number, pickup: string): NormalizedCarResult {
  return {id:`kayak-sandbox:${offer.id}`,category:"economy",categoryLabel:offer.details[0] || "Category not supplied",
    modelName:offer.title,orSimilar:false,imageUrl:offer.images?.[0]?.url,imageAlt:offer.title,
    passengers:0,bags:0,doors:0,transmission:"automatic",airConditioning:false,fuelPolicy:"other",mileagePolicy:"limited",
    pickupType:"city-location",pickupLocation:pickup,returnLocation:pickup,shuttleRequired:false,
    rentalCompanyName:offer.details[1] || "Supplier not supplied",recommendationScore:0,requiredDocuments:[],includedItems:[],importantInformation:[],
    inventorySource:"kayak-sandbox",sandboxPresentation:{specs:offer.carSpecs || ["Specifications not supplied"],pickupLabel:"Search pickup",filterOptions:offer.carFilterOptions},
    offers:[{id:offer.id,bookingProviderName:offer.description,rentalCompanyName:offer.details[1] || "Supplier not supplied",
      currency:offer.currency,totalPrice:offer.priceBasis === "per day" ? offer.price*days : offer.price,
      pricePerDay:offer.priceBasis === "per day" ? offer.price : offer.price/days,
      taxesAndFeesIncluded:false,payAtPickup:false,freeCancellation:false,bookingUrl:offer.testUrl}]};
}
