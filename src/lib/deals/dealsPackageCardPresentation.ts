import { getPrimaryCarOffer } from "@/lib/cars/carResults";
import type { DealsPackageCandidate, DealsPackageProduct } from "./dealsPackageCandidates";

const internalPath = (href: unknown, product: DealsPackageProduct) => {
  if (typeof href !== "string" || !href.startsWith(`/${product === "car" ? "cars" : `${product}s`}/details/`) || href.startsWith("//") || href.includes("\\") || href.includes("#")) return null;
  try { const url=new URL(href,"https://kurioticket.invalid"); return url.origin === "https://kurioticket.invalid" ? `${url.pathname}${url.search}` : null; } catch { return null; }
};
const dateTime=(value:string)=>{ const date=new Date(value); return Number.isNaN(date.valueOf())?value:new Intl.DateTimeFormat("en",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(date); };
const normalizedReview=(score?:number,scale?:number)=>score==null?null:score*(10/(scale||10));
const actionHref=(action:unknown)=>typeof action==="object"&&action!==null&&"href" in action&&typeof action.href==="string"?action.href:undefined;
export function getDealsPackageCardPresentation(candidate: DealsPackageCandidate) {
  const flight=candidate.flight, hotel=candidate.hotel, car=candidate.car, offer=car?getPrimaryCarOffer(car):undefined;
  const components = candidate.priceBreakdown.map(price=>({ ...price, detailsPath: internalPath(actionHref(candidate[price.product]?.searchPolicy.action??{}),price.product) }));
  return {
    anchor:candidate.anchor,
    headingId:`package-${candidate.id.replace(/[^a-zA-Z0-9_-]/g,"-")}`,
    title:hotel?.name ?? (flight?`${flight.originAirport} to ${flight.destinationAirport}`:"Complete trip"),
    flight:flight?{airline:flight.airlineName,logo:flight.airlineLogo,number:flight.flightNumber,route:`${flight.originAirport} → ${flight.destinationAirport}`,dateTime:`${dateTime(flight.departureTime)} – ${dateTime(flight.arrivalTime)}`,durationStops:`${flight.duration} · ${flight.stops===0?"Nonstop":`${flight.stops} stop${flight.stops===1?"":"s"}`}`,cabin:flight.cabinClass,baggage:flight.baggageInfo,provider:flight.provider,detailsPath:internalPath(actionHref(flight.searchPolicy.action),"flight")} : null,
    hotel:hotel?{name:hotel.name,image:[hotel.imageUrl,...(hotel.imageUrls??[])].find(Boolean),stars:hotel.classificationStars??hotel.rating,review:normalizedReview(hotel.reviewScore,hotel.reviewScale),reviewCount:hotel.reviewCount??0,location:hotel.neighbourhood||hotel.location,room:hotel.roomType,cancellation:hotel.cancellationInfo,amenities:hotel.amenities.slice(0,3),provider:hotel.provider,detailsPath:internalPath(actionHref(hotel.searchPolicy.action),"hotel")} : null,
    car:car?{model:`${car.modelName}${car.orSimilar?" or similar":""}`,category:car.categoryLabel,company:car.rentalCompanyName,locations:`${car.pickupLocation} → ${car.returnLocation}`,capacity:`${car.passengers} passengers · ${car.bags} bags`,policy:`${car.transmission} · ${offer?.freeCancellation?"Free cancellation":"Cancellation restrictions"} · ${offer?.payAtPickup?"Pay at pickup":"Prepayment may apply"}`,provider:offer?.bookingProviderName||car.rentalCompanyName,detailsPath:internalPath(actionHref(car.searchPolicy.action),"car")} : null,
    components,
  };
}
