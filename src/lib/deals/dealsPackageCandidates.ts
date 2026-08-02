import { getPrimaryCarOffer } from "@/lib/cars/carResults";
import type { NormalizedCarResult } from "@/lib/cars/types";
import { convertCurrencyAmount, type ExchangeRates } from "@/lib/currency/exchangeRates";
import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";
import type { ContractResult, TravelResultAction } from "@/lib/travel/searchContract";
import type { DealsPackageMode } from "./dealsSearchParams";

export const DEALS_PACKAGE_CANDIDATE_LIMIT = 6;
export type DealsPackageProduct = "flight" | "hotel" | "car";
export type DealsPackageStrategy = "recommended" | "lowest-total" | "comfort" | "alternative";
/**
 * These are Kurioticket-created combinations of independently sourced results,
 * not upstream package offers. Every component is booked separately. Never
 * infer a package from matching provider names or providerCount === 1.
 */
export type DealsCandidateBookingFlow = "separate-providers";
export type DealsPackagePriceComponent = { product: DealsPackageProduct; sourceAmount: number; sourceCurrency: string; displayAmount: number | null; provider: string };
export type DealsPackageCandidate = {
  id: string; mode: DealsPackageMode; strategy: DealsPackageStrategy; bookingFlow: DealsCandidateBookingFlow; badgeKey: string; reasonKey: string;
  flight?: ContractResult<PublicFlightResult>; hotel?: ContractResult<PublicHotelResult>; car?: ContractResult<NormalizedCarResult>;
  priceBreakdown: DealsPackagePriceComponent[]; estimatedTotal: number | null; displayCurrency: string; providerCount: number; anchor: "hotel" | "flight";
};
type Input = { mode: DealsPackageMode; flights: ContractResult<PublicFlightResult>[]; hotels: ContractResult<PublicHotelResult>[]; cars: ContractResult<NormalizedCarResult>[]; displayCurrency: string; rates: ExchangeRates };
type Option<T> = { result: T; displayPrice: number | null };

const included = (mode: DealsPackageMode) => ({ flight: mode !== "hotel-car", hotel: mode !== "flight-car", car: mode !== "hotel-flight" });
function safeInternalDetail(action: TravelResultAction, product: "flights" | "hotels" | "cars", id: string) {
  if (!id.trim() || !action.enabled || action.kind !== "internal-detail") return false;
  try { const url = new URL(action.href, "https://kurioticket.invalid"); return url.origin === "https://kurioticket.invalid" && url.pathname === `/${product}/details/${encodeURIComponent(id.trim())}` && !action.href.startsWith("//") && !action.href.includes("\\") && !action.href.includes("#"); } catch { return false; }
}
const liveBookable = (item: { searchPolicy: ContractResult<object>["searchPolicy"] }) => item.searchPolicy.bookable && item.searchPolicy.action.enabled;
export const isDealsFlightEligible = (item: ContractResult<PublicFlightResult>) => Boolean(item.id.trim() && Number.isFinite(item.price) && item.price > 0 && item.currency?.trim() && liveBookable(item) && safeInternalDetail(item.searchPolicy.action, "flights", item.id));
export const isDealsHotelEligible = (item: ContractResult<PublicHotelResult>) => Boolean(item.id.trim() && Number.isFinite(item.totalPrice) && item.totalPrice! > 0 && item.currency?.trim() && liveBookable(item) && safeInternalDetail(item.searchPolicy.action, "hotels", item.id));
export const isDealsCarEligible = (item: ContractResult<NormalizedCarResult>) => { const offer = getPrimaryCarOffer(item); return Boolean(item.id.trim() && offer && Number.isFinite(offer.totalPrice) && offer.totalPrice > 0 && offer.currency.trim() && !item.searchPolicy.bookable && safeInternalDetail(item.searchPolicy.action, "cars", item.id)); };

const asc = (a: number | null | undefined, b: number | null | undefined) => (a ?? Number.POSITIVE_INFINITY) - (b ?? Number.POSITIVE_INFINITY);
const desc = (a: number | null | undefined, b: number | null | undefined) => (b ?? Number.NEGATIVE_INFINITY) - (a ?? Number.NEGATIVE_INFINITY);
const stable = (a: { result: { id: string } }, b: { result: { id: string } }) => a.result.id.localeCompare(b.result.id);
const first = (...values: number[]) => values.find(value => value !== 0) ?? 0;
const normalizedReview = (hotel: PublicHotelResult) => hotel.reviewScore == null ? hotel.rating : hotel.reviewScore * (10 / (hotel.reviewScale ?? 10));
const flexible = (hotel: PublicHotelResult) => /free|flexib|refundable/i.test(hotel.cancellationInfo) ? 1 : 0;
const flightRecommended = (a: Option<ContractResult<PublicFlightResult>>, b: Option<ContractResult<PublicFlightResult>>) => first(desc(a.result.valueScore,b.result.valueScore),desc(a.result.travelConfidenceScore,b.result.travelConfidenceScore),desc(a.result.comfortScore,b.result.comfortScore),asc(a.displayPrice,b.displayPrice),asc(a.result.durationMinutes,b.result.durationMinutes),stable(a,b));
const flightLowest = (a: Option<ContractResult<PublicFlightResult>>, b: Option<ContractResult<PublicFlightResult>>) => first(asc(a.displayPrice,b.displayPrice),asc(a.result.durationMinutes,b.result.durationMinutes),asc(a.result.stops,b.result.stops),stable(a,b));
const flightComfort = (a: Option<ContractResult<PublicFlightResult>>, b: Option<ContractResult<PublicFlightResult>>) => first(desc(a.result.comfortScore,b.result.comfortScore),asc(a.result.stops,b.result.stops),asc(a.result.durationMinutes,b.result.durationMinutes),asc(a.result.riskScore,b.result.riskScore),asc(a.displayPrice,b.displayPrice),stable(a,b));
const hotelRecommended = (a: Option<ContractResult<PublicHotelResult>>, b: Option<ContractResult<PublicHotelResult>>) => first(desc(a.result.valueScore,b.result.valueScore),desc(a.result.travelConfidenceScore,b.result.travelConfidenceScore),desc(a.result.arrivalSuitabilityScore,b.result.arrivalSuitabilityScore),asc(a.displayPrice,b.displayPrice),stable(a,b));
const hotelLowest = (a: Option<ContractResult<PublicHotelResult>>, b: Option<ContractResult<PublicHotelResult>>) => first(asc(a.displayPrice,b.displayPrice),desc(normalizedReview(a.result),normalizedReview(b.result)),stable(a,b));
const hotelComfort = (a: Option<ContractResult<PublicHotelResult>>, b: Option<ContractResult<PublicHotelResult>>) => first(desc(normalizedReview(a.result),normalizedReview(b.result)),desc(a.result.reviewCount,b.result.reviewCount),desc(a.result.classificationStars,b.result.classificationStars),desc(flexible(a.result),flexible(b.result)),desc(a.result.arrivalSuitabilityScore,b.result.arrivalSuitabilityScore),asc(a.displayPrice,b.displayPrice),stable(a,b));
const carRecommended = (a: Option<ContractResult<NormalizedCarResult>>, b: Option<ContractResult<NormalizedCarResult>>) => first(desc(a.result.recommendationScore,b.result.recommendationScore),desc(a.result.supplierRating,b.result.supplierRating),desc(Number(getPrimaryCarOffer(a.result)?.freeCancellation),Number(getPrimaryCarOffer(b.result)?.freeCancellation)),asc(a.displayPrice,b.displayPrice),stable(a,b));
const carLowest = (a: Option<ContractResult<NormalizedCarResult>>, b: Option<ContractResult<NormalizedCarResult>>) => first(asc(a.displayPrice,b.displayPrice),desc(a.result.supplierRating,b.result.supplierRating),stable(a,b));
const carComfort = (a: Option<ContractResult<NormalizedCarResult>>, b: Option<ContractResult<NormalizedCarResult>>) => first(desc(a.result.supplierRating,b.result.supplierRating),desc(a.result.recommendationScore,b.result.recommendationScore),desc(Number(a.result.transmission === "automatic"),Number(b.result.transmission === "automatic")),desc(Number(getPrimaryCarOffer(a.result)?.freeCancellation),Number(getPrimaryCarOffer(b.result)?.freeCancellation)),desc(a.result.passengers + a.result.bags,b.result.passengers + b.result.bags),asc(a.displayPrice,b.displayPrice),stable(a,b));

/** Builds at most six deterministic complete combinations without constructing a Cartesian product. */
export function buildDealsPackageCandidates({ mode, flights, hotels, cars, displayCurrency, rates }: Input): DealsPackageCandidate[] {
  const needs = included(mode), currency = displayCurrency.toUpperCase();
  const flightBase = flights.filter(isDealsFlightEligible).map(result => ({ result, displayPrice: convertCurrencyAmount(result.price,result.currency,currency,rates) }));
  const hotelBase = hotels.filter(isDealsHotelEligible).map(result => ({ result, displayPrice: convertCurrencyAmount(result.totalPrice!,result.currency!,currency,rates) }));
  const carBase = cars.filter(isDealsCarEligible).map(result => { const offer=getPrimaryCarOffer(result)!; return { result, displayPrice: convertCurrencyAmount(offer.totalPrice,offer.currency,currency,rates) }; });
  if ((needs.flight&&!flightBase.length)||(needs.hotel&&!hotelBase.length)||(needs.car&&!carBase.length)) return [];
  const sorted = <T,>(items: Option<T>[], compare: (a: Option<T>,b: Option<T>)=>number) => [...items].sort(compare);
  const fr=sorted(flightBase,flightRecommended), fl=sorted(flightBase,flightLowest), fc=sorted(flightBase,flightComfort);
  const hr=sorted(hotelBase,hotelRecommended), hl=sorted(hotelBase,hotelLowest), hc=sorted(hotelBase,hotelComfort);
  const cr=sorted(carBase,carRecommended), cl=sorted(carBase,carLowest), cc=sorted(carBase,carComfort);
  const output: DealsPackageCandidate[]=[]; const seen=new Set<string>();
  const add=(strategy: DealsPackageStrategy, flight?: typeof flights[number], hotel?: typeof hotels[number], car?: typeof cars[number])=>{
    const id=[mode,flight&&`flight-${flight.id}`,hotel&&`hotel-${hotel.id}`,car&&`car-${car.id}`].filter(Boolean).join("::"); if(seen.has(id)) return; seen.add(id);
    const raw: Array<[DealsPackageProduct,number,string,string]> = [];
    if(flight) raw.push(["flight",flight.price,flight.currency,flight.provider]); if(hotel) raw.push(["hotel",hotel.totalPrice!,hotel.currency!,hotel.provider]);
    if(car){const offer=getPrimaryCarOffer(car)!; raw.push(["car",offer.totalPrice,offer.currency,offer.bookingProviderName||car.rentalCompanyName]);}
    const priceBreakdown=raw.map(([product,sourceAmount,sourceCurrency,provider])=>({product,sourceAmount,sourceCurrency,provider,displayAmount:convertCurrencyAmount(sourceAmount,sourceCurrency,currency,rates)}));
    const estimatedTotal=priceBreakdown.every(p=>p.displayAmount!==null)?priceBreakdown.reduce((sum,p)=>sum+p.displayAmount!,0):null;
    output.push({id,mode,strategy,bookingFlow:"separate-providers",badgeKey:`deals.results.package.${strategy}.badge`,reasonKey:`deals.results.package.${strategy}.reason`,flight,hotel,car,priceBreakdown,estimatedTotal,displayCurrency:currency,providerCount:new Set(priceBreakdown.map(p=>p.provider.trim().toLowerCase()).filter(Boolean)).size,anchor:needs.hotel?"hotel":"flight"});
  };
  add("recommended",needs.flight?fr[0].result:undefined,needs.hotel?hr[0].result:undefined,needs.car?cr[0].result:undefined);
  const lowestConvertible=(!needs.flight||fl[0].displayPrice!==null)&&(!needs.hotel||hl[0].displayPrice!==null)&&(!needs.car||cl[0].displayPrice!==null);
  if(lowestConvertible) add("lowest-total",needs.flight?fl[0].result:undefined,needs.hotel?hl[0].result:undefined,needs.car?cl[0].result:undefined);
  const comfortMeaningful=(!needs.flight||fc[0].result.comfortScore>0)&&(!needs.hotel||normalizedReview(hc[0].result)>0)&&(!needs.car||Boolean(cc[0].result.supplierRating));
  add(comfortMeaningful?"comfort":"alternative",needs.flight?fc[0].result:undefined,needs.hotel?hc[0].result:undefined,needs.car?cc[0].result:undefined);
  if(needs.hotel){for(let i=1;i<hr.length&&output.length<DEALS_PACKAGE_CANDIDATE_LIMIT;i++) add("alternative",needs.flight?fr[(i-1)%fr.length].result:undefined,hr[i].result,needs.car?cr[(i-1)%cr.length].result:undefined);}
  else {for(let i=1;i<fr.length&&output.length<DEALS_PACKAGE_CANDIDATE_LIMIT;i++) add("alternative",fr[i].result,undefined,needs.car?cr[(i-1)%cr.length].result:undefined);}
  for(let i=1;output.length<DEALS_PACKAGE_CANDIDATE_LIMIT&&i<Math.max(fr.length,hr.length,cr.length);i++) add("alternative",needs.flight?fr[i%fr.length].result:undefined,needs.hotel?hr[i%hr.length].result:undefined,needs.car?cr[i%cr.length].result:undefined);
  return output.slice(0,DEALS_PACKAGE_CANDIDATE_LIMIT);
}
