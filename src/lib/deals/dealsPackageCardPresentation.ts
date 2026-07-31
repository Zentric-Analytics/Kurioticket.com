import { getPrimaryCarOffer } from "@/lib/cars/carResults";
import { normalizeHotelClassificationStars, normalizeHotelReviewCount } from "@/lib/hotels/hotelRatingSemantics";
import type { DealsSearch } from "./dealsSearchParams";
import type { DealsPackageCandidate, DealsPackageProduct } from "./dealsPackageCandidates";

const internalPath = (href: unknown, product: DealsPackageProduct) => {
  if (typeof href !== "string" || !href.startsWith(`/${product === "car" ? "cars" : `${product}s`}/details/`) || href.startsWith("//") || href.includes("\\") || href.includes("#")) return null;
  try { const url=new URL(href,"https://kurioticket.invalid"); return url.origin === "https://kurioticket.invalid" ? `${url.pathname}${url.search}` : null; } catch { return null; }
};
const actionHref=(action:unknown)=>typeof action==="object"&&action!==null&&"href" in action&&typeof action.href==="string"?action.href:undefined;
const dayCount=(start:string,end:string)=>{const from=Date.parse(`${start}T00:00:00Z`),to=Date.parse(`${end}T00:00:00Z`);return Number.isFinite(from)&&Number.isFinite(to)&&to>from?Math.round((to-from)/86_400_000):null;};
const normalizedReview=(score?:number,scale?:number)=>score==null?null:score*(10/(scale||10));

export function getDealsPackageCardPresentation(candidate: DealsPackageCandidate, search: DealsSearch) {
  const flight=candidate.flight, hotel=candidate.hotel, car=candidate.car, offer=car?getPrimaryCarOffer(car):undefined;
  const legs=flight?(flight.legs?.length?flight.legs:[{direction:"outbound" as const,originAirport:flight.originAirport,destinationAirport:flight.destinationAirport,departureTime:flight.departureTime,arrivalTime:flight.arrivalTime,duration:flight.duration,stops:flight.stops,layovers:flight.layovers,segments:[]} ]):[];
  const destination=search.flightDestinationText||search.hotelDestination||flight?.destinationAirport||hotel?.location||search.carPickupLocation;
  return {
    anchor:candidate.anchor,
    headingId:`package-${candidate.id.replace(/[^a-zA-Z0-9_-]/g,"-")}`,
    title:destination?`Trip to ${destination}`:"Complete trip",
    dateRange:{start:search.flightDepartureDate||search.hotelCheckIn||search.carPickupDate,end:search.flightReturnDate||search.hotelCheckOut||search.carReturnDate},
    flight:flight?{airline:flight.airlineName,number:flight.flightNumber,cabin:flight.cabinClass,baggage:flight.baggageInfo,provider:flight.provider,detailsPath:internalPath(actionHref(flight.searchPolicy.action),"flight"),legs:legs.map(leg=>({direction:leg.direction,origin:leg.originAirport,destination:leg.destinationAirport,departure:leg.departureTime,arrival:leg.arrivalTime,duration:leg.duration,stops:leg.stops,layovers:leg.layovers,segments:leg.segments}))}:null,
    hotel:hotel?{name:hotel.name,image:[hotel.imageUrl,...(hotel.imageUrls??[])].find(Boolean),stars:normalizeHotelClassificationStars(hotel.classificationStars),review:normalizedReview(hotel.reviewScore,hotel.reviewScale),reviewCount:normalizeHotelReviewCount(hotel.reviewCount),location:hotel.neighbourhood||hotel.location,room:hotel.roomType,cancellation:hotel.cancellationInfo,amenities:hotel.amenities.slice(0,3),provider:hotel.provider,detailsPath:internalPath(actionHref(hotel.searchPolicy.action),"hotel"),checkIn:search.hotelCheckIn,checkOut:search.hotelCheckOut,nights:dayCount(search.hotelCheckIn,search.hotelCheckOut),rooms:search.hotelRooms,guests:search.hotelAdults+search.hotelChildren}:null,
    car:car?{model:`${car.modelName}${car.orSimilar?" or similar":""}`,category:car.categoryLabel,company:car.rentalCompanyName,locations:`${car.pickupLocation} → ${car.returnLocation}`,capacity:{passengers:car.passengers,bags:car.bags},policy:{freeCancellation:Boolean(offer?.freeCancellation),payAtPickup:Boolean(offer?.payAtPickup)},provider:offer?.bookingProviderName||car.rentalCompanyName,detailsPath:internalPath(actionHref(car.searchPolicy.action),"car"),pickupDate:search.carPickupDate,returnDate:search.carReturnDate,pickupTime:search.carPickupTime,returnTime:search.carReturnTime,duration:dayCount(search.carPickupDate,search.carReturnDate)}:null,
  };
}
