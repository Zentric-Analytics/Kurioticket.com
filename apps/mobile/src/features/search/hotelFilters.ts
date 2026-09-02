import type { HotelResult } from "../../api/travelApi";
import { convertAmount, type ExchangeRates } from "../currency/displayCurrency";

export type HotelStarRating = 1 | 2 | 3 | 4 | 5;
export type HotelFilterGroup = "areas" | "propertyTypes" | "roomTypes" | "bedTypes" | "meals" | "cancellationPolicies" | "facilities" | "travellerFeatures" | "accessibility";
export type HotelFilters = Record<HotelFilterGroup, string[]> & {
  propertyNameQuery: string;
  minimumPrice: number | null;
  maximumPrice: number | null;
  starRatings: HotelStarRating[];
};
export type HotelFilterOption = { value: string; label: string; count: number };
export type HotelPriceContext = { currency: "USD"; minimum: number; maximum: number; valueForResult: (hotel: HotelResult) => number | null };
export type HotelFilterOptions = Record<HotelFilterGroup, HotelFilterOption[]> & { starCounts: Record<0 | HotelStarRating, number>; price: HotelPriceContext | null };

const groups: HotelFilterGroup[] = ["areas", "propertyTypes", "roomTypes", "bedTypes", "meals", "cancellationPolicies", "facilities", "travellerFeatures", "accessibility"];
export const emptyHotelFilters = (): HotelFilters => ({ propertyNameQuery: "", minimumPrice: null, maximumPrice: null, starRatings: [], areas: [], propertyTypes: [], roomTypes: [], bedTypes: [], meals: [], cancellationPolicies: [], facilities: [], travellerFeatures: [], accessibility: [] });

const termGroups = {
  propertyTypes: [["hotel", "Hotel", ["hotel"]], ["apartment", "Apartment", ["apartment", "apartments", "aparthotel"]], ["resort", "Resort", ["resort"]], ["suite", "Suite", ["suite", "suites"]], ["inn", "Inn", ["inn"]], ["hostel", "Hostel", ["hostel"]], ["villa", "Villa", ["villa"]]],
  roomTypes: [["single-room", "Single Room", ["single room", "single standard", "single"]], ["double-room", "Double Room", ["double room", "double standard", "double"]], ["twin-room", "Twin Room", ["twin room", "twin standard", "twin"]], ["family-room", "Family Room", ["family room", "family standard", "family"]], ["suite", "Suites", ["suite"]], ["standard-room", "Standard Room", ["standard room"]], ["deluxe-room", "Deluxe Room", ["deluxe room"]], ["studio", "Studio", ["studio"]]],
  bedTypes: [["twin-beds", "Twin Beds", ["twin bed", "twin beds", "2 twin", "two twin"]], ["double-bed", "Double Bed", ["double bed", "double beds"]], ["queen-bed", "Queen Bed", ["queen bed", "queen beds", "queen room"]], ["king-bed", "King Bed", ["king bed", "king beds", "king room"]]],
  meals: [["room-only", "Room only", ["room only", "accommodation only"]], ["half-board", "Half board", ["half board"]], ["full-board", "Full board", ["full board"]], ["all-inclusive", "All inclusive", ["all inclusive", "all-inclusive"]]],
  cancellationPolicies: [["free-cancellation", "Free cancellation", ["free cancellation"]], ["flexible-cancellation", "Flexible cancellation", ["flexible cancellation", "flexible cancellation window"]], ["policy-available", "Cancellation policy available", ["cancellation policy available", "policy shown", "cancellation details", "cancellation rules", "rate comments"]]],
} as const;

const normalize = (value: string) => value.trim().replace(/[‐‑‒–—]/g, "-").replace(/\s+/g, " ").toLocaleLowerCase();
const includesTerms = (text: string, terms: readonly string[]) => terms.some(term => text.toLocaleLowerCase().includes(term));
const searchable = (hotel: HotelResult) => [hotel.name, hotel.location, hotel.roomType, hotel.cancellationInfo, ...hotel.amenities].join(" ");
const legacyText = (hotel: HotelResult, group: keyof typeof termGroups) => group === "propertyTypes" ? `${hotel.name} ${hotel.roomType}` : group === "roomTypes" || group === "bedTypes" ? hotel.roomType : group === "cancellationPolicies" ? `${hotel.cancellationInfo} ${hotel.amenities.join(" ")}` : searchable(hotel);
const structuredText = (hotel: HotelResult, group: "propertyTypes" | "roomTypes" | "bedTypes") => group === "propertyTypes" ? hotel.catalogueProfile?.propertyType : group === "roomTypes" ? hotel.catalogueProfile?.room.name : hotel.catalogueProfile?.room.bedConfiguration;

const facilityLabels: Record<string, string> = {wifi:"Free Wi-Fi",breakfast:"Breakfast",pool:"Pool",spa:"Spa",airportShuttle:"Airport shuttle",parking:"Parking",petFriendly:"Pet friendly",evCharging:"EV charging",fitness:"Fitness center",workspace:"Workspace",quietRooms:"Quiet rooms",frontDesk:"24-hour front desk",lateCheckIn:"Late check-in",kitchenette:"Kitchenette",bikeStorage:"Bike storage",courtyard:"Courtyard",lounge:"Lounge",restaurant:"Restaurant",bar:"Bar",airConditioning:"Air conditioning"};
const facilityAliasValues: Record<string, string> = {
  "free wi-fi":"wifi","free wifi":"wifi","wi-fi":"wifi",wifi:"wifi","wireless internet":"wifi",
  "breakfast included":"breakfast","breakfast available":"breakfast","complimentary breakfast":"breakfast",breakfast:"breakfast",
  pool:"pool","swimming pool":"pool","indoor pool":"pool","outdoor pool":"pool",
  spa:"spa",wellness:"spa","wellness centre":"spa","wellness center":"spa",
  "airport shuttle":"airportShuttle","airport transfer":"airportShuttle","shuttle to airport":"airportShuttle",
  parking:"parking","free parking":"parking","onsite parking":"parking","on-site parking":"parking",
  "pet friendly":"petFriendly","pet-friendly":"petFriendly","pets allowed":"petFriendly",
  "ev charging":"evCharging","ev charger":"evCharging","electric vehicle charging":"evCharging","electric car charging":"evCharging",
  "fitness room":"fitness","fitness centre":"fitness","fitness center":"fitness",fitness:"fitness",gym:"fitness",
  workspace:"workspace","work desk":"workspace",desk:"workspace","coworking space":"workspace",
  "quiet rooms":"quietRooms","quiet room":"quietRooms",
  "24-hour front desk":"frontDesk","24-hour desk":"frontDesk","front desk":"frontDesk","concierge desk":"frontDesk",concierge:"frontDesk",reception:"frontDesk",
  "late check-in":"lateCheckIn","late checkin":"lateCheckIn",
  kitchenette:"kitchenette",kitchen:"kitchenette","in-room kitchen":"kitchenette",
  "bike storage":"bikeStorage","bicycle storage":"bikeStorage",
  courtyard:"courtyard","garden courtyard":"courtyard",garden:"courtyard",
  lounge:"lounge","river-view lounge":"lounge","riverside lounge":"lounge","waterfront lounge":"lounge",
  restaurant:"restaurant","onsite restaurant":"restaurant","on-site restaurant":"restaurant",dining:"restaurant",
  bar:"bar","air conditioning":"airConditioning","air-conditioned":"airConditioning","climate control":"airConditioning",
};
const excludedFacility = (v:string) => /\b(cancellation|cancel|policy|refund|refundable|prepayment|payment|pay at property|pay later)\b/.test(v) || /\b(verified partner inventory|provider placeholder|inventory placeholder)\b/.test(v) || /^(room only|accommodation only|half board|full board|all-inclusive|all inclusive)$/.test(v) || /^(airport corridor|airport area|city centre|city center|business district|museum district|old town|waterfront|riverside quarter|central|transit-friendly area|central or transit-friendly area)$/.test(v);
const facilitiesFor = (hotel: HotelResult) => new Map(hotel.amenities.flatMap(raw => { const label=raw.trim().replace(/[‐‑‒–—]/g,"-").replace(/\s+/g," "),n=normalize(label); if (!n || excludedFacility(n)) return []; const value=facilityAliasValues[n]; return [[value ?? `generic-${n}`,value ? facilityLabels[value] : label] as [string,string]]; }));
const optionSort=(a:HotelFilterOption,b:HotelFilterOption)=>b.count-a.count||a.label.localeCompare(b.label);
const facilityPriority=["petFriendly","parking","evCharging","pool","spa","fitness"];
const facilitySort=(a:HotelFilterOption,b:HotelFilterOption)=>{const ai=facilityPriority.indexOf(a.value),bi=facilityPriority.indexOf(b.value);if(ai>=0||bi>=0){if(ai<0)return 1;if(bi<0)return -1;return ai-bi;}return optionSort(a,b);};
const structuredOptions = (hotels: readonly HotelResult[], getValues: (hotel: HotelResult) => readonly string[]) => {
  const found = new Map<string, HotelFilterOption>();
  hotels.forEach(hotel => new Map(getValues(hotel).flatMap(raw => { const label=raw.trim().replace(/\s+/g," "),value=normalize(label); return value ? [[value,label] as const] : []; })).forEach((label,value)=>{const prior=found.get(value);if(prior)prior.count++;else found.set(value,{value,label,count:1});}));
  return [...found.values()].filter(option=>option.count>=2&&option.count<hotels.length).sort(optionSort);
};
const buildPropertyTypeOptions = (hotels: readonly HotelResult[]) => {
  const found=new Map<string,HotelFilterOption>();
  hotels.forEach(hotel=>{const raw=structuredText(hotel,"propertyTypes");if(raw?.trim()){const label=raw.trim().replace(/\s+/g," "),value=normalize(label),prior=found.get(value);if(prior)prior.count++;else found.set(value,{value,label,count:1});return;} for(const [value,label,terms] of termGroups.propertyTypes)if(includesTerms(legacyText(hotel,"propertyTypes"),terms)){const prior=found.get(value);if(prior)prior.count++;else found.set(value,{value,label,count:1});}});
  return [...found.values()].sort(optionSort);
};
const canonicalRoomOrBedOptions = (hotels: readonly HotelResult[], group: "roomTypes" | "bedTypes") => termGroups[group].map(([value,label,terms])=>({value,label,count:hotels.filter(h=>includesTerms(structuredText(h,group)??"",terms)).length})).filter(option=>option.count>0&&(group==="roomTypes"||option.count<hotels.length)).sort(optionSort);

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
  return {starCounts,price:resolveHotelPriceContext(hotels,rates),areas:[...areasMap.values()].sort(optionSort),propertyTypes:buildPropertyTypeOptions(hotels),roomTypes:canonicalRoomOrBedOptions(hotels,"roomTypes"),bedTypes:canonicalRoomOrBedOptions(hotels,"bedTypes"),meals:legacyOptions("meals"),cancellationPolicies:legacyOptions("cancellationPolicies"),facilities:[...facilityMap.values()].sort(facilitySort),travellerFeatures:structuredOptions(hotels,h=>h.catalogueProfile?.travellerFeatures??[]),accessibility:structuredOptions(hotels,h=>h.catalogueProfile?.accessibilityFeatures??[])};
}

const matchesPropertyType = (hotel:HotelResult,selected:string[]) => {const structured=structuredText(hotel,"propertyTypes");if(structured?.trim())return selected.includes(normalize(structured));return selected.some(value=>{const term=termGroups.propertyTypes.find(x=>x[0]===value);return term?includesTerms(legacyText(hotel,"propertyTypes"),term[2]):false;});};
const matchesCanonicalRoomOrBed = (hotel:HotelResult,group:"roomTypes"|"bedTypes",selected:string[]) => selected.some(value=>{const term=termGroups[group].find(x=>x[0]===value);return term?includesTerms(structuredText(hotel,group)??"",term[2]):false;});
const matchesStructured = (values:readonly string[]|undefined,selected:string[]) => selected.some(value=>(values??[]).some(raw=>normalize(raw)===value));
export function hotelMatchesFilters(hotel: HotelResult, filters: HotelFilters, options: HotelFilterOptions): boolean {
  if(filters.propertyNameQuery.trim()&&!normalize(hotel.name).includes(normalize(filters.propertyNameQuery)))return false;
  if(filters.minimumPrice!==null||filters.maximumPrice!==null){const total=options.price?.valueForResult(hotel);if(total===null||total===undefined)return false;if(filters.minimumPrice!==null&&total<filters.minimumPrice)return false;if(filters.maximumPrice!==null&&total>filters.maximumPrice)return false;}
  if(filters.starRatings.length&&!filters.starRatings.includes(hotel.classificationStars as HotelStarRating))return false;
  if(filters.areas.length&&(!hotel.neighbourhood||!filters.areas.includes(normalize(hotel.neighbourhood))))return false;
  if(filters.propertyTypes.length&&!matchesPropertyType(hotel,filters.propertyTypes))return false;
  for(const group of ["roomTypes","bedTypes"] as const)if(filters[group].length&&!matchesCanonicalRoomOrBed(hotel,group,filters[group]))return false;
  for(const group of ["meals","cancellationPolicies"] as const)if(filters[group].length&&!filters[group].some(value=>{const term=termGroups[group].find(x=>x[0]===value);return term?includesTerms(legacyText(hotel,group),term[2]):false;}))return false;
  if(filters.facilities.length&&!filters.facilities.some(v=>facilitiesFor(hotel).has(v)))return false;
  if(filters.travellerFeatures.length&&!matchesStructured(hotel.catalogueProfile?.travellerFeatures,filters.travellerFeatures))return false;
  if(filters.accessibility.length&&!matchesStructured(hotel.catalogueProfile?.accessibilityFeatures,filters.accessibility))return false;
  return true;
}
export const filterHotels=(hotels:readonly HotelResult[],filters:HotelFilters,options:HotelFilterOptions)=>hotels.filter(h=>hotelMatchesFilters(h,filters,options));
export const activeHotelFilterCount=(filters:HotelFilters,options?:HotelFilterOptions)=>(filters.propertyNameQuery.trim()?1:0)+((filters.minimumPrice!==null&&filters.minimumPrice>(options?.price?.minimum??0))||(filters.maximumPrice!==null&&filters.maximumPrice<(options?.price?.maximum??Infinity))?1:0)+filters.starRatings.length+groups.reduce((n,k)=>n+filters[k].length,0);
