import type { CarFilterGroup, CarFilterOption } from "../../../../../src/lib/cars/carFilterPresentation";

type FilterCopy = { filters: string; allCars: string; applied: string; clearAll: string; close: string; show: string; car: string; cars: string; groups: Record<string, string>; options: Record<string, string> };

const english: FilterCopy = {
  filters: "Filters", allCars: "All cars shown", applied: "applied", clearAll: "Clear all", close: "Close car filters", show: "Show", car: "car", cars: "cars",
  groups: { totalPrice: "Total price", vehicleType: "Vehicle type", transmission: "Transmission", seats: "Seats", bags: "Bags", fuelPolicy: "Fuel policy", mileagePolicy: "Mileage", cancellation: "Booking flexibility", pickupLocationType: "Pickup location type" },
  options: { totalUnder100: "Under $100 total", total100To149: "$100–$149 total", total150Plus: "$150+ total", smallCars: "Small cars", mediumCars: "Medium cars", suvs: "SUVs", automatic: "Automatic", manual: "Manual", seats4Plus: "4+ seats", seats5Plus: "5+ seats", seats7Plus: "7+ seats", bags2Plus: "2+ bags", bags3Plus: "3+ bags", bags4Plus: "4+ bags", fullToFull: "Full to full", sameToSame: "Same to same", unlimitedMileage: "Unlimited mileage", limitedMileage: "Limited mileage", freeCancellation: "Free cancellation", payAtPickup: "Pay at pickup", airportCounter: "Airport counter", shuttlePickup: "Shuttle pickup", cityLocation: "City location" },
};

const localized: Record<string, Partial<FilterCopy>> = {
  es: { filters: "Filtros", allCars: "Todos los coches", applied: "aplicados", clearAll: "Borrar todo", close: "Cerrar filtros de coches", show: "Mostrar", car: "coche", cars: "coches", groups: { totalPrice: "Precio total", vehicleType: "Tipo de vehículo", transmission: "Transmisión", seats: "Asientos", bags: "Equipaje", fuelPolicy: "Política de combustible", mileagePolicy: "Kilometraje", cancellation: "Flexibilidad de reserva", pickupLocationType: "Tipo de recogida" }, options: {} },
  ar: { filters: "عوامل التصفية", allCars: "عرض جميع السيارات", applied: "مطبّقة", clearAll: "مسح الكل", close: "إغلاق عوامل تصفية السيارات", show: "عرض", car: "سيارة", cars: "سيارات", groups: { totalPrice: "السعر الإجمالي", vehicleType: "نوع السيارة", transmission: "ناقل الحركة", seats: "المقاعد", bags: "الحقائب", fuelPolicy: "سياسة الوقود", mileagePolicy: "المسافة", cancellation: "مرونة الحجز", pickupLocationType: "نوع موقع الاستلام" }, options: {} },
};

export const carFilterCopy = (locale: string): FilterCopy => ({ ...english, ...(localized[locale.toLowerCase().split(/[-_]/)[0]] ?? {}), groups: { ...english.groups, ...(localized[locale.toLowerCase().split(/[-_]/)[0]]?.groups ?? {}) }, options: { ...english.options, ...(localized[locale.toLowerCase().split(/[-_]/)[0]]?.options ?? {}) } });
export const carFilterGroupLabel = (copy: FilterCopy, group: CarFilterGroup) => copy.groups[group.id] ?? group.title ?? group.titleKey;
export const carFilterOptionLabel = (copy: FilterCopy, option: CarFilterOption) => copy.options[option.id] ?? option.label ?? option.labelKey;
