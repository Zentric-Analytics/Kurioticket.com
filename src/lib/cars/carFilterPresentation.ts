export type CarFilterOption = {
  id: string;
  labelKey: string;
  label?: string;
  count?: number;
};

export type CarFilterGroup = {
  id: string;
  titleKey: string;
  title?: string;
  options: CarFilterOption[];
};

/** One platform-neutral list of the Car filter dimensions exposed by Web and Native. */
export const carFilterGroups: CarFilterGroup[] = [
  { id: "totalPrice", titleKey: "", title: "Total price", options: [
    { id: "totalUnder100", labelKey: "", label: "Under $100 total" },
    { id: "total100To149", labelKey: "", label: "$100–$149 total" },
    { id: "total150Plus", labelKey: "", label: "$150+ total" },
  ] },
  { id: "vehicleType", titleKey: "carsResults.vehicleType", options: [
    { id: "smallCars", labelKey: "carsResults.smallCars" },
    { id: "mediumCars", labelKey: "carsResults.mediumCars" },
    { id: "suvs", labelKey: "carsResults.suvs" },
    { id: "luxuryCars", labelKey: "carsTripStyle.luxury.title" },
    { id: "vans", labelKey: "carsTripStyle.van.title" },
  ] },
  { id: "transmission", titleKey: "carsResults.transmission", options: [
    { id: "automatic", labelKey: "carsResults.automatic" },
    { id: "manual", labelKey: "carsResults.manual" },
  ] },
  { id: "seats", titleKey: "carsResults.seats", options: [
    { id: "seats4Plus", labelKey: "carsResults.seats4Plus" },
    { id: "seats5Plus", labelKey: "carsResults.seats5Plus" },
    { id: "seats7Plus", labelKey: "carsResults.seats7Plus" },
  ] },
  { id: "bags", titleKey: "carsResults.bags", options: [
    { id: "bags2Plus", labelKey: "carsResults.bags2Plus" },
    { id: "bags3Plus", labelKey: "carsResults.bags3Plus" },
    { id: "bags4Plus", labelKey: "carsResults.bags4Plus" },
  ] },
  { id: "fuelPolicy", titleKey: "carsResults.fuelPolicy", options: [
    { id: "fullToFull", labelKey: "carsResults.fullToFull" },
    { id: "sameToSame", labelKey: "carsResults.sameToSame" },
  ] },
  { id: "mileagePolicy", titleKey: "carsResults.mileagePolicy", options: [
    { id: "unlimitedMileage", labelKey: "carsResults.unlimitedMileage" },
    { id: "limitedMileage", labelKey: "carsResults.limitedMileage" },
  ] },
  { id: "cancellation", titleKey: "carsResults.cancellation", options: [
    { id: "freeCancellation", labelKey: "carsResults.freeCancellation" },
    { id: "payAtPickup", labelKey: "carsResults.payAtPickup" },
  ] },
  { id: "pickupLocationType", titleKey: "carsResults.pickupLocationType", options: [
    { id: "airportCounter", labelKey: "carsResults.airportCounter" },
    { id: "shuttlePickup", labelKey: "carsResults.shuttlePickup" },
    { id: "cityLocation", labelKey: "carsResults.cityLocation" },
  ] },
];

export const carQuickFilterGroupIds = ["totalPrice", "vehicleType", "transmission", "seats", "cancellation", "pickupLocationType"] as const;
