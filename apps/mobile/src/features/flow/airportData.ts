import { SHARED_AIRPORTS } from "../../../../../shared/travel/airports";

export type Airport = {
  code: string;
  city: string;
  country: string;
  countryCode: string;
  airport: string;
  priority: number;
};

/** Mobile-only shape adapter over the platform-neutral canonical records. */
export const airports: readonly Airport[] = SHARED_AIRPORTS.map((airport) => ({
  code: airport.code,
  city: airport.city,
  country: airport.country,
  countryCode: airport.countryCode,
  airport: airport.airport,
  priority: airport.priority,
}));
