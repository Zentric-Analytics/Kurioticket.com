import type { PublicHotelResult } from "@/lib/types";
import type { ContractResult } from "@/lib/travel/searchContract";
import { isDealsHotelEligible } from "./dealsPackageCandidates";
import { createDealsJourneyProgress, type DealsJourneyProgress } from "./dealsJourneyProgress";
import type { DealsPackageMode } from "./dealsSearchParams";
import { validateDealsProductDetailsPath, type DealsTripPlanHotel } from "./dealsTripPlan";

export type DealsHotelJourneyPhase = "choose-property" | "choose-room" | "complete";
export type DealsHotelPropertyOption = { id: string; result: ContractResult<PublicHotelResult> };
export type DealsHotelRoomOption = { id: string; propertyId: string; roomType: string; sourcePrice: number; sourceCurrency: string; cancellationInfo: string; taxesAndFeesIncluded?: boolean; detailsPath: string; result: ContractResult<PublicHotelResult> };

export const buildDealsHotelPropertyOptions = (results: ContractResult<PublicHotelResult>[]): DealsHotelPropertyOption[] =>
  results.filter(isDealsHotelEligible).map(result => ({ id: result.id.trim(), result }));

export function buildDealsHotelRoomOptions(property: DealsHotelPropertyOption): DealsHotelRoomOption[] {
  const hotel = property.result;
  const detailsPath = hotel.searchPolicy.action.kind === "internal-detail" ? validateDealsProductDetailsPath(hotel.searchPolicy.action.href, "hotel", hotel.id) : null;
  if (!isDealsHotelEligible(hotel) || !hotel.roomType.trim() || !Number.isFinite(hotel.totalPrice) || !hotel.totalPrice || hotel.totalPrice <= 0 || !hotel.currency?.trim() || !detailsPath) return [];
  return [{ id: `hotel:${encodeURIComponent(hotel.id.trim())}:room:${encodeURIComponent(hotel.roomType.trim())}`, propertyId: hotel.id.trim(), roomType: hotel.roomType, sourcePrice: hotel.totalPrice, sourceCurrency: hotel.currency, cancellationInfo: hotel.cancellationInfo, ...(hotel.taxesAndFeesIncluded === undefined ? {} : { taxesAndFeesIncluded: hotel.taxesAndFeesIncluded }), detailsPath, result: hotel }];
}

export function confirmDealsHotelRoom(option: DealsHotelRoomOption, search: { hotelCheckIn: string; hotelCheckOut: string }, receivedAt?: number): DealsTripPlanHotel | null {
  if (receivedAt === undefined || !Number.isFinite(receivedAt) || receivedAt < 0 || !buildDealsHotelRoomOptions({ id: option.propertyId, result: option.result }).some(room => room.id === option.id)) return null;
  const hotel = option.result;
  return { id: hotel.id.trim(), provider: hotel.provider.trim(), name: hotel.name.trim(), location: (hotel.neighbourhood || hotel.location).trim(), checkIn: search.hotelCheckIn, checkOut: search.hotelCheckOut, roomType: option.roomType, sourcePrice: option.sourcePrice, sourceCurrency: option.sourceCurrency, resultReceivedAt: receivedAt, detailsPath: option.detailsPath };
}

export function getStagedHotelProgress(mode: DealsPackageMode, phase: DealsHotelJourneyPhase, hotel?: DealsTripPlanHotel): DealsJourneyProgress {
  if (phase !== "complete") return createDealsJourneyProgress(mode, { hotel: { status: "current", substate: phase } });
  const next = mode === "hotel-car" ? "car" : "flight";
  return createDealsJourneyProgress(mode, { hotel: { status: "completed", summary: hotel ? `${hotel.name} · ${hotel.roomType ?? ""}` : undefined }, [next]: { status: "current", substate: next === "car" ? "choose-car" : "choose-outbound" }, review: { status: "upcoming" } });
}
