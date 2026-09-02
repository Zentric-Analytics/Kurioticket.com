import type { HotelResult } from "../../api/travelApi";
import { convertAmount, type ExchangeRates } from "../currency/displayCurrency";

export type HotelStarRating = 1 | 2 | 3 | 4 | 5;
export type HotelFilterGroup = "areas" | "propertyTypes" | "roomTypes" | "bedTypes" | "meals" | "cancellationPolicies" | "facilities";
export type HotelFilters = Record<HotelFilterGroup, string[]> & { maximumPrice: number | null; starRating: HotelStarRating | null };
export type HotelFilterOption = { value: string; label: string; count: number };
export type HotelPriceContext = { currency: "USD"; minimum: number; maximum: number; valueForResult: (hotel: HotelResult) => number | null };
export type HotelFilterOptions = Record<HotelFilterGroup, HotelFilterOption[]> & { starCounts: Record<0 | HotelStarRating, number>; price: HotelPriceContext | null };

export const emptyHotelFilters = (): HotelFilters => ({ maximumPrice: null, starRating: null, areas: [], propertyTypes: [], roomTypes: [], bedTypes: [], meals: [], cancellationPolicies: [], facilities: [] });

const termGroups = {
  propertyTypes: [
    ["hotel", "Hotel", ["hotel"]], ["apartment", "Apartment", ["apartment", "apartments", "aparthotel"]], ["resort", "Resort", ["resort"]], ["suite", "Suite", ["suite", "suites"]], ["inn", "Inn", ["inn"]], ["hostel", "Hostel", ["hostel"]], ["villa", "Villa", ["villa"]],
  ],
  roomTypes: [
    ["single-room", "Single room", ["single room", "single standard", "single"]], ["double-room", "Double room", ["double room", "double standard", "double"]], ["twin-room", "Twin room", ["twin room", "twin standard", "twin"]], ["family-room", "Family room", ["family room", "family standard", "family"]], ["suite", "Suite", ["suite"]], ["standard-room", "Standard room", ["standard room"]], ["deluxe-room", "Deluxe room", ["deluxe room"]], ["studio", "Studio", ["studio"]],
  ],
  bedTypes: [
    ["twin-beds", "Twin beds", ["twin bed", "twin beds", "2 twin", "two twin"]], ["double-bed", "Double bed", ["double bed", "double beds"]], ["queen-bed", "Queen bed", ["queen bed", "queen beds", "queen room"]], ["king-bed", "King bed", ["king bed", "king beds", "king room"]],
  ],
  meals: [
    ["room-only", "Room only", ["room only", "accommodation only"]], ["half-board", "Half board", ["half board"]], ["full-board", "Full board", ["full board"]], ["all-inclusive", "All inclusive", ["all inclusive", "all-inclusive"]],
  ],
  cancellationPolicies: [
    ["free-cancellation", "Free cancellation", ["free cancellation"]], ["flexible-cancellation", "Flexible cancellation", ["flexible cancellation", "flexible cancellation window"]], ["policy-available", "Cancellation policy available", ["cancellation policy available", "policy shown", "cancellation details", "cancellation rules", "rate comments"]],
  ],
} as const;

const normalize = (value: string) => value.trim().replace(/[‐‑‒–—]/g, "-").replace(/\s+/g, " ").toLocaleLowerCase();
const includesTerms = (text: string, terms: readonly string[]) => terms.some(term => text.toLocaleLowerCase().includes(term));
const searchable = (hotel: HotelResult) => [hotel.name, hotel.location, hotel.roomType, hotel.cancellationInfo, ...hotel.amenities].join(" ");
const textForGroup = (hotel: HotelResult, group: keyof typeof termGroups) => group === "propertyTypes" ? `${hotel.name} ${hotel.roomType}` : group === "roomTypes" || group === "bedTypes" ? hotel.roomType : group === "cancellationPolicies" ? `${hotel.cancellationInfo} ${hotel.amenities.join(" ")}` : searchable(hotel);

const facilityAliases: Record<string, [string, string]> = {
  "free wi-fi":["wifi","Wi-Fi"],"free wifi":["wifi","Wi-Fi"],"wi-fi":["wifi","Wi-Fi"],wifi:["wifi","Wi-Fi"],"wireless internet":["wifi","Wi-Fi"],
  "breakfast included":["breakfast","Breakfast"],"breakfast available":["breakfast","Breakfast"],breakfast:["breakfast","Breakfast"],pool:["pool","Pool"],"swimming pool":["pool","Pool"],spa:["spa","Spa"],wellness:["spa","Spa"],"airport shuttle":["airportShuttle","Airport shuttle"],parking:["parking","Parking"],"free parking":["parking","Parking"],gym:["fitness","Fitness center"],fitness:["fitness","Fitness center"],"fitness center":["fitness","Fitness center"],workspace:["workspace","Workspace"],desk:["workspace","Workspace"],"quiet rooms":["quietRooms","Quiet rooms"],"24-hour front desk":["frontDesk","24-hour front desk"],"front desk":["frontDesk","24-hour front desk"],"late check-in":["lateCheckIn","Late check-in"],kitchenette:["kitchenette","Kitchenette"],kitchen:["kitchenette","Kitchenette"],"bike storage":["bikeStorage","Bike storage"],courtyard:["courtyard","Courtyard"],lounge:["lounge","Lounge"],restaurant:["restaurant","Restaurant"],"air conditioning":["airConditioning","Air conditioning"],
};
const excludedFacility = (v:string) => /\b(cancellation|cancel|policy|refund|refundable|prepayment|payment|pay at property|pay later)\b/.test(v) || /^(room only|accommodation only|half board|full board|all-inclusive|all inclusive)$/.test(v);
const facilitiesFor = (hotel: HotelResult) => new Map(hotel.amenities.flatMap(raw => { const n=normalize(raw); if (!n || excludedFacility(n)) return []; const known=facilityAliases[n]; return [known ?? [n, raw.trim().replace(/\s+/g," ")] as [string,string]]; }));

export function resolveHotelPriceContext(hotels: readonly HotelResult[], rates: ExchangeRates): HotelPriceContext | null {
  const valueForResult = (hotel: HotelResult) => Number.isFinite(hotel.totalPrice) && hotel.totalPrice! > 0 && typeof hotel.currency === "string" ? convertAmount(hotel.totalPrice!, hotel.currency, "USD", rates) : null;
  const totals = hotels.map(valueForResult).filter((v): v is number => v !== null && Number.isFinite(v));
  if (!totals.length) return null;
  return { currency: "USD", minimum: 100, maximum: Math.max(300, Math.ceil(Math.max(...totals) / 100) * 100), valueForResult };
}

export function buildHotelFilterOptions(hotels: readonly HotelResult[], destination: string, rates: ExchangeRates = {}): HotelFilterOptions {
  const starCounts: HotelFilterOptions["starCounts"] = {0:hotels.length,1:0,2:0,3:0,4:0,5:0};
  hotels.forEach(h => { if (Number.isInteger(h.classificationStars) && h.classificationStars! >= 1 && h.classificationStars! <= 5) starCounts[h.classificationStars as HotelStarRating]++; });
  const primaryCity=normalize(destination.split(",")[0] || "");
  const areasMap=new Map<string,HotelFilterOption>();
  hotels.forEach(h=>{if(!h.neighbourhood)return;const clean=h.neighbourhood.trim().replace(/\s+/g," "),value=normalize(clean);if(!value)return;const prior=areasMap.get(value);if(prior)prior.count++;else {const segments=clean.split(",").map(normalize);areasMap.set(value,{value,label:primaryCity&&segments.includes(primaryCity)?clean:`${clean}, ${destination.trim().replace(/\s+/g," ")}`,count:1});}});
  const options = (group:keyof typeof termGroups) => termGroups[group].map(([value,label,terms])=>({value,label,count:hotels.filter(h=>includesTerms(textForGroup(h,group),terms)).length})).filter(x=>x.count>0).sort(optionSort);
  const facilityMap=new Map<string,HotelFilterOption>();hotels.forEach(h=>facilitiesFor(h).forEach((label,value)=>{const p=facilityMap.get(value);if(p)p.count++;else facilityMap.set(value,{value,label,count:1});}));
  return {starCounts,price:resolveHotelPriceContext(hotels,rates),areas:[...areasMap.values()].sort(optionSort),propertyTypes:options("propertyTypes"),roomTypes:options("roomTypes"),bedTypes:options("bedTypes"),meals:options("meals"),cancellationPolicies:options("cancellationPolicies"),facilities:[...facilityMap.values()].sort(optionSort)};
}
const optionSort=(a:HotelFilterOption,b:HotelFilterOption)=>b.count-a.count||a.label.localeCompare(b.label);

export function hotelMatchesFilters(hotel: HotelResult, filters: HotelFilters, options: HotelFilterOptions): boolean {
  if (filters.maximumPrice !== null && (options.price?.valueForResult(hotel) ?? Infinity) > filters.maximumPrice) return false;
  if (filters.starRating !== null && hotel.classificationStars !== filters.starRating) return false;
  if (filters.areas.length && (!hotel.neighbourhood || !filters.areas.includes(normalize(hotel.neighbourhood)))) return false;
  for (const group of Object.keys(termGroups) as (keyof typeof termGroups)[]) if (filters[group].length && !filters[group].some(value=>{const term=termGroups[group].find(x=>x[0]===value);return term ? includesTerms(textForGroup(hotel,group),term[2]) : false;})) return false;
  if (filters.facilities.length) { const values=facilitiesFor(hotel); if(!filters.facilities.some(v=>values.has(v))) return false; }
  return true;
}
export const filterHotels = (hotels: readonly HotelResult[], filters: HotelFilters, options: HotelFilterOptions) => hotels.filter(h=>hotelMatchesFilters(h,filters,options));
export const activeHotelFilterCount = (filters:HotelFilters, options?:HotelFilterOptions) => (filters.maximumPrice !== null && filters.maximumPrice < (options?.price?.maximum ?? Infinity) ? 1 : 0) + (filters.starRating===null?0:1) + (["areas","propertyTypes","roomTypes","bedTypes","meals","cancellationPolicies","facilities"] as HotelFilterGroup[]).reduce((n,k)=>n+filters[k].length,0);
