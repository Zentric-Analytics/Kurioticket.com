import type { HotelResult } from "../../api/travelApi";
import { convertAmount, type ExchangeRates } from "../currency/displayCurrency";

export type HotelStarRating = 1 | 2 | 3 | 4 | 5;
export type HotelFilterGroup = "areas" | "propertyTypes" | "roomTypes" | "bedTypes" | "meals" | "cancellationPolicies" | "facilities" | "travellerFeatures" | "accessibility";
export type HotelFilters = Record<HotelFilterGroup, string[]> & {
  propertyNameQuery: string;
  minimumPrice: number | null;
  maximumPrice: number | null;
  starRating: HotelStarRating | null;
};
export type HotelFilterOption = { value: string; label: string; count: number };
export type HotelPriceContext = { currency: "USD"; minimum: number; maximum: number; valueForResult: (hotel: HotelResult) => number | null };
export type HotelFilterOptions = Record<HotelFilterGroup, HotelFilterOption[]> & { starCounts: Record<0 | HotelStarRating, number>; price: HotelPriceContext | null };

const groups: HotelFilterGroup[] = ["areas", "propertyTypes", "roomTypes", "bedTypes", "meals", "cancellationPolicies", "facilities", "travellerFeatures", "accessibility"];
export const emptyHotelFilters = (): HotelFilters => ({ propertyNameQuery: "", minimumPrice: null, maximumPrice: null, starRating: null, areas: [], propertyTypes: [], roomTypes: [], bedTypes: [], meals: [], cancellationPolicies: [], facilities: [], travellerFeatures: [], accessibility: [] });

const termGroups = {
  propertyTypes: [["hotel", "Hotel", ["hotel"]], ["apartment", "Apartment", ["apartment", "apartments", "aparthotel"]], ["resort", "Resort", ["resort"]], ["suite", "Suite", ["suite", "suites"]], ["inn", "Inn", ["inn"]], ["hostel", "Hostel", ["hostel"]], ["villa", "Villa", ["villa"]]],
  roomTypes: [["single-room", "Single room", ["single room", "single standard", "single"]], ["double-room", "Double room", ["double room", "double standard", "double"]], ["twin-room", "Twin room", ["twin room", "twin standard", "twin"]], ["family-room", "Family room", ["family room", "family standard", "family"]], ["suite", "Suite", ["suite"]], ["standard-room", "Standard room", ["standard room"]], ["deluxe-room", "Deluxe room", ["deluxe room"]], ["studio", "Studio", ["studio"]]],
  bedTypes: [["twin-beds", "Twin beds", ["twin bed", "twin beds", "2 twin", "two twin"]], ["double-bed", "Double bed", ["double bed", "double beds"]], ["queen-bed", "Queen bed", ["queen bed", "queen beds", "queen room"]], ["king-bed", "King bed", ["king bed", "king beds", "king room"]]],
  meals: [["room-only", "Room only", ["room only", "accommodation only"]], ["half-board", "Half board", ["half board"]], ["full-board", "Full board", ["full board"]], ["all-inclusive", "All inclusive", ["all inclusive", "all-inclusive"]]],
  cancellationPolicies: [["free-cancellation", "Free cancellation", ["free cancellation"]], ["flexible-cancellation", "Flexible cancellation", ["flexible cancellation", "flexible cancellation window"]], ["policy-available", "Cancellation policy available", ["cancellation policy available", "policy shown", "cancellation details", "cancellation rules", "rate comments"]]],
} as const;

const normalize = (value: string) => value.trim().replace(/[‐‑‒–—]/g, "-").replace(/\s+/g, " ").toLocaleLowerCase();
const includesTerms = (text: string, terms: readonly string[]) => terms.some(term => text.toLocaleLowerCase().includes(term));
const searchable = (hotel: HotelResult) => [hotel.name, hotel.location, hotel.roomType, hotel.cancellationInfo, ...hotel.amenities].join(" ");
const legacyText = (hotel: HotelResult, group: keyof typeof termGroups) => group === "propertyTypes" ? `${hotel.name} ${hotel.roomType}` : group === "roomTypes" || group === "bedTypes" ? hotel.roomType : group === "cancellationPolicies" ? `${hotel.cancellationInfo} ${hotel.amenities.join(" ")}` : searchable(hotel);
const structuredText = (hotel: HotelResult, group: "propertyTypes" | "roomTypes" | "bedTypes") => group === "propertyTypes" ? hotel.catalogueProfile?.propertyType : group === "roomTypes" ? hotel.catalogueProfile?.room.name : hotel.catalogueProfile?.room.bedConfiguration;

const facilityAliases: Record<string, [string, string]> = {"free wi-fi":["wifi","Wi-Fi"],"free wifi":["wifi","Wi-Fi"],"wi-fi":["wifi","Wi-Fi"],wifi:["wifi","Wi-Fi"],"wireless internet":["wifi","Wi-Fi"],"breakfast included":["breakfast","Breakfast"],"breakfast available":["breakfast","Breakfast"],breakfast:["breakfast","Breakfast"],pool:["pool","Pool"],"swimming pool":["pool","Pool"],spa:["spa","Spa"],wellness:["spa","Spa"],"airport shuttle":["airportShuttle","Airport shuttle"],parking:["parking","Parking"],"free parking":["parking","Parking"],gym:["fitness","Fitness center"],fitness:["fitness","Fitness center"],"fitness center":["fitness","Fitness center"],workspace:["workspace","Workspace"],desk:["workspace","Workspace"],"quiet rooms":["quietRooms","Quiet rooms"],"24-hour front desk":["frontDesk","24-hour front desk"],"front desk":["frontDesk","24-hour front desk"],"late check-in":["lateCheckIn","Late check-in"],kitchenette:["kitchenette","Kitchenette"],kitchen:["kitchenette","Kitchenette"],"bike storage":["bikeStorage","Bike storage"],courtyard:["courtyard","Courtyard"],lounge:["lounge","Lounge"],restaurant:["restaurant","Restaurant"],"air conditioning":["airConditioning","Air conditioning"]};
const excludedFacility = (v:string) => /\b(cancellation|cancel|policy|refund|refundable|prepayment|payment|pay at property|pay later)\b/.test(v) || /^(room only|accommodation only|half board|full board|all-inclusive|all inclusive)$/.test(v);
const facilitiesFor = (hotel: HotelResult) => new Map(hotel.amenities.flatMap(raw => { const n=normalize(raw); if (!n || excludedFacility(n)) return []; const known=facilityAliases[n]; return [known ?? [n, raw.trim().replace(/\s+/g," ")] as [string,string]]; }));
const optionSort=(a:HotelFilterOption,b:HotelFilterOption)=>b.count-a.count||a.label.localeCompare(b.label);
const structuredOptions = (hotels: readonly HotelResult[], getValues: (hotel: HotelResult) => readonly string[]) => {
  const found = new Map<string, HotelFilterOption>();
  hotels.forEach(hotel => new Map(getValues(hotel).flatMap(raw => { const label=raw.trim().replace(/\s+/g," "),value=normalize(label); return value ? [[value,label] as const] : []; })).forEach((label,value)=>{const prior=found.get(value);if(prior)prior.count++;else found.set(value,{value,label,count:1});}));
  return [...found.values()].filter(option=>option.count>=2&&option.count<hotels.length).sort(optionSort);
};
const authoritativeOptions = (hotels: readonly HotelResult[], group: "propertyTypes" | "roomTypes" | "bedTypes") => {
  const found=new Map<string,HotelFilterOption>();
  hotels.forEach(hotel=>{const raw=structuredText(hotel,group);if(raw?.trim()){const label=raw.trim().replace(/\s+/g," "),value=normalize(label),prior=found.get(value);if(prior)prior.count++;else found.set(value,{value,label,count:1});return;} for(const [value,label,terms] of termGroups[group])if(includesTerms(legacyText(hotel,group),terms)){const prior=found.get(value);if(prior)prior.count++;else found.set(value,{value,label,count:1});}});
  return [...found.values()].sort(optionSort);
};

export function resolveHotelPriceContext(hotels: readonly HotelResult[], rates: ExchangeRates): HotelPriceContext | null {
  const valueForResult = (hotel: HotelResult) => Number.isFinite(hotel.totalPrice) && hotel.totalPrice! > 0 && typeof hotel.currency === "string" ? convertAmount(hotel.totalPrice!, hotel.currency, "USD", rates) : null;
  const totals = hotels.map(valueForResult).filter((v): v is number => v !== null && Number.isFinite(v));
  return totals.length ? { currency:"USD", minimum:0, maximum:Math.max(300,Math.ceil(Math.max(...totals)/100)*100), valueForResult } : null;
}

export function buildHotelFilterOptions(hotels: readonly HotelResult[], destination: string, rates: ExchangeRates = {}): HotelFilterOptions {
  const starCounts:HotelFilterOptions["starCounts"]={0:hotels.length,1:0,2:0,3:0,4:0,5:0};hotels.forEach(h=>{if(Number.isInteger(h.classificationStars)&&h.classificationStars!>=1&&h.classificationStars!<=5)starCounts[h.classificationStars as HotelStarRating]++;});
  const primaryCity=normalize(destination.split(",")[0]||""),areasMap=new Map<string,HotelFilterOption>();hotels.forEach(h=>{if(!h.neighbourhood)return;const clean=h.neighbourhood.trim().replace(/\s+/g," "),value=normalize(clean);if(!value)return;const prior=areasMap.get(value);if(prior)prior.count++;else{const segments=clean.split(",").map(normalize);areasMap.set(value,{value,label:primaryCity&&segments.includes(primaryCity)?clean:`${clean}, ${destination.trim().replace(/\s+/g," ")}`,count:1});}});
  const legacyOptions=(group:"meals"|"cancellationPolicies")=>termGroups[group].map(([value,label,terms])=>({value,label,count:hotels.filter(h=>includesTerms(legacyText(h,group),terms)).length})).filter(x=>x.count>0).sort(optionSort);
  const facilityMap=new Map<string,HotelFilterOption>();hotels.forEach(h=>facilitiesFor(h).forEach((label,value)=>{const p=facilityMap.get(value);if(p)p.count++;else facilityMap.set(value,{value,label,count:1});}));
  return {starCounts,price:resolveHotelPriceContext(hotels,rates),areas:[...areasMap.values()].sort(optionSort),propertyTypes:authoritativeOptions(hotels,"propertyTypes"),roomTypes:authoritativeOptions(hotels,"roomTypes"),bedTypes:authoritativeOptions(hotels,"bedTypes"),meals:legacyOptions("meals"),cancellationPolicies:legacyOptions("cancellationPolicies"),facilities:[...facilityMap.values()].sort(optionSort),travellerFeatures:structuredOptions(hotels,h=>h.catalogueProfile?.travellerFeatures??[]),accessibility:structuredOptions(hotels,h=>h.catalogueProfile?.accessibilityFeatures??[])};
}

const matchesAuthoritative = (hotel:HotelResult,group:"propertyTypes"|"roomTypes"|"bedTypes",selected:string[]) => {const structured=structuredText(hotel,group);if(structured?.trim())return selected.includes(normalize(structured));return selected.some(value=>{const term=termGroups[group].find(x=>x[0]===value);return term?includesTerms(legacyText(hotel,group),term[2]):false;});};
const matchesStructured = (values:readonly string[]|undefined,selected:string[]) => selected.some(value=>(values??[]).some(raw=>normalize(raw)===value));
export function hotelMatchesFilters(hotel: HotelResult, filters: HotelFilters, options: HotelFilterOptions): boolean {
  if(filters.propertyNameQuery.trim()&&!normalize(hotel.name).includes(normalize(filters.propertyNameQuery)))return false;
  if(filters.minimumPrice!==null||filters.maximumPrice!==null){const total=options.price?.valueForResult(hotel);if(total===null||total===undefined)return false;if(filters.minimumPrice!==null&&total<filters.minimumPrice)return false;if(filters.maximumPrice!==null&&total>filters.maximumPrice)return false;}
  if(filters.starRating!==null&&hotel.classificationStars!==filters.starRating)return false;
  if(filters.areas.length&&(!hotel.neighbourhood||!filters.areas.includes(normalize(hotel.neighbourhood))))return false;
  for(const group of ["propertyTypes","roomTypes","bedTypes"] as const)if(filters[group].length&&!matchesAuthoritative(hotel,group,filters[group]))return false;
  for(const group of ["meals","cancellationPolicies"] as const)if(filters[group].length&&!filters[group].some(value=>{const term=termGroups[group].find(x=>x[0]===value);return term?includesTerms(legacyText(hotel,group),term[2]):false;}))return false;
  if(filters.facilities.length&&!filters.facilities.some(v=>facilitiesFor(hotel).has(v)))return false;
  if(filters.travellerFeatures.length&&!matchesStructured(hotel.catalogueProfile?.travellerFeatures,filters.travellerFeatures))return false;
  if(filters.accessibility.length&&!matchesStructured(hotel.catalogueProfile?.accessibilityFeatures,filters.accessibility))return false;
  return true;
}
export const filterHotels=(hotels:readonly HotelResult[],filters:HotelFilters,options:HotelFilterOptions)=>hotels.filter(h=>hotelMatchesFilters(h,filters,options));
export const activeHotelFilterCount=(filters:HotelFilters,options?:HotelFilterOptions)=>(filters.propertyNameQuery.trim()?1:0)+((filters.minimumPrice!==null&&filters.minimumPrice>(options?.price?.minimum??0))||(filters.maximumPrice!==null&&filters.maximumPrice<(options?.price?.maximum??Infinity))?1:0)+(filters.starRating===null?0:1)+groups.reduce((n,k)=>n+filters[k].length,0);
