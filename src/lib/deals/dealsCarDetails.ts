import { buildCarDetailsHref } from "@/lib/cars/carResults";
import type { NormalizedCarResult } from "@/lib/cars/types";
import { buildCarApiPayload, type DealsSearch } from "./dealsSearchParams";
import { normalizeDealsJourneyCarId } from "./dealsJourneyRoutes";
import { validateDealsCarDetailsPath, type DealsTripPlanCar } from "./dealsTripPlan";

export function getEffectiveDealsCarDetailsId(transientCarId: unknown, confirmedCarId: unknown): string | null {
  return normalizeDealsJourneyCarId(transientCarId) ?? normalizeDealsJourneyCarId(confirmedCarId);
}

export function isCurrentDealsCarDetailsResponse(requestedCarId: unknown, car: unknown): car is NormalizedCarResult {
  const id = normalizeDealsJourneyCarId(requestedCarId);
  if (!id || !car || typeof car !== "object" || Array.isArray(car)) return false;
  const result = car as Partial<NormalizedCarResult>;
  return normalizeDealsJourneyCarId(result.id) === id && result.id === id && typeof result.modelName === "string" && typeof result.categoryLabel === "string" && typeof result.rentalCompanyName === "string" && typeof result.pickupLocation === "string" && typeof result.returnLocation === "string" && Array.isArray(result.offers);
}

export function buildDealsCarInternalDetailsPath(carId: string, search: DealsSearch): string | null {
  const id = normalizeDealsJourneyCarId(carId);
  if (!id) return null;
  return validateDealsCarDetailsPath(buildCarDetailsHref(id, buildCarApiPayload(search)));
}

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

export function buildDealsCarDetailsSelection({ car, requestedCarId, search, resultReceivedAt }: { car: NormalizedCarResult; requestedCarId: string; search: DealsSearch; resultReceivedAt: number }): DealsTripPlanCar | null {
  const id = normalizeDealsJourneyCarId(requestedCarId);
  if (!id || car.id !== id) return null;
  const primaryOffer = car.offers.filter((offer) => Number.isFinite(offer.totalPrice) && offer.totalPrice > 0).sort((a, b) => a.totalPrice - b.totalPrice || a.pricePerDay - b.pricePerDay || a.id.localeCompare(b.id))[0];
  if (!primaryOffer) return null;
  const provider = clean(primaryOffer.bookingProviderName) || clean(car.rentalCompanyName);
  const rentalCompany = clean(car.rentalCompanyName);
  const modelName = clean(car.modelName);
  const categoryLabel = clean(car.categoryLabel);
  const pickupLocation = clean(car.pickupLocation);
  const returnLocation = clean(car.returnLocation);
  const sourceCurrency = clean(primaryOffer.currency);
  const detailsPath = buildDealsCarInternalDetailsPath(id, search);
  if (!provider || !rentalCompany || !modelName || !categoryLabel || !pickupLocation || !returnLocation || !sourceCurrency || !detailsPath) return null;
  if (!search.carPickupDate || !search.carPickupTime || !search.carReturnDate || !search.carReturnTime) return null;
  if (!Number.isFinite(primaryOffer.totalPrice) || primaryOffer.totalPrice <= 0 || !Number.isFinite(resultReceivedAt) || resultReceivedAt <= 0) return null;
  return { id, provider, rentalCompany, modelName, categoryLabel, pickupLocation, returnLocation, pickupDate: search.carPickupDate, pickupTime: search.carPickupTime, dropoffDate: search.carReturnDate, dropoffTime: search.carReturnTime, sourcePrice: primaryOffer.totalPrice, sourceCurrency, resultReceivedAt, detailsPath };
}

export function areDealsCarSelectionsMateriallyEqual(left?: DealsTripPlanCar, right?: DealsTripPlanCar): boolean {
  if (!left || !right) return false;
  return left.id === right.id && left.provider === right.provider && left.rentalCompany === right.rentalCompany && left.modelName === right.modelName && left.categoryLabel === right.categoryLabel && left.pickupLocation === right.pickupLocation && left.returnLocation === right.returnLocation && left.pickupDate === right.pickupDate && left.pickupTime === right.pickupTime && left.dropoffDate === right.dropoffDate && left.dropoffTime === right.dropoffTime && left.sourcePrice === right.sourcePrice && left.sourceCurrency === right.sourceCurrency && left.detailsPath === right.detailsPath;
}
