import {
  airports,
  normalizeAirportSearchText,
  searchAirports,
} from "@/shared/airports";
import { supportedRegions } from "@/lib/region/supportedRegions";

/** Canonical suggestions only; selecting a suggestion never changes saved CMS data until Save draft. */
export type CmsLocationOption = {
  value: string;
  title: string;
  description?: string;
  country?: string;
  countryCode?: string;
  manual?: boolean;
};

const countryOptions: CmsLocationOption[] = supportedRegions
  .filter((region) => region.code !== "EU")
  .map((region) => ({
    value: region.country,
    title: region.country,
    description: region.code,
    country: region.country,
    countryCode: region.code,
  }))
  .sort((a, b) => a.title.localeCompare(b.title));

const countriesByCode = new Map(
  countryOptions.map((option) => [option.countryCode, option.country] as const),
);

const cityByCountry = new Map<string, CmsLocationOption>();
for (const airport of airports) {
  const key = normalizeAirportSearchText(airport.city) + ":" + (airport.countryCode ?? "");
  if (!cityByCountry.has(key)) {
    const country = countriesByCode.get(airport.countryCode) ?? airport.country ?? "";
    cityByCountry.set(key, {
      value: airport.city,
      title: airport.city,
      description: country,
      country,
      countryCode: airport.countryCode,
    });
  }
}
const cityOptions = [...cityByCountry.values()].sort(
  (a, b) => a.title.localeCompare(b.title) || (a.country ?? "").localeCompare(b.country ?? ""),
);

function matches(option: CmsLocationOption, query: string): boolean {
  return [option.title, option.description ?? "", option.countryCode ?? ""]
    .some((candidate) => normalizeAirportSearchText(candidate).includes(query));
}

export function getCmsCountrySuggestions(query: string, limit = 8): CmsLocationOption[] {
  const needle = normalizeAirportSearchText(query);
  return countryOptions
    .filter((option) => !needle || matches(option, needle))
    .sort((a, b) => {
      const aStart = normalizeAirportSearchText(a.title).startsWith(needle) ? 0 : 1;
      const bStart = normalizeAirportSearchText(b.title).startsWith(needle) ? 0 : 1;
      return aStart - bStart || a.title.localeCompare(b.title);
    })
    .slice(0, Math.max(0, limit));
}

export function getCmsCitySuggestions(query: string, countryCode = "", limit = 8): CmsLocationOption[] {
  const needle = normalizeAirportSearchText(query);
  return cityOptions
    .filter((option) => !needle || matches(option, needle))
    .sort((a, b) => {
      const aStarts = normalizeAirportSearchText(a.title).startsWith(needle) ? 0 : 1;
      const bStarts = normalizeAirportSearchText(b.title).startsWith(needle) ? 0 : 1;
      const aCountry = a.countryCode === countryCode ? 0 : 1;
      const bCountry = b.countryCode === countryCode ? 0 : 1;
      return aStarts - bStarts || aCountry - bCountry || a.title.localeCompare(b.title);
    })
    .slice(0, Math.max(0, limit));
}

export function getCmsAirportSuggestions(query: string, limit = 8): CmsLocationOption[] {
  const results: CmsLocationOption[] = searchAirports(query, Math.max(0, limit)).map((airport) => ({
    value: airport.code,
    title: airport.code + " · " + airport.city,
    description: airport.airport + (airport.country ? " · " + airport.country : ""),
    country: airport.country,
    countryCode: airport.countryCode,
  }));
  const typedCode = query.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(typedCode) && !results.some((option) => option.value === typedCode)) {
    results.push({
      value: typedCode,
      title: "Use " + typedCode,
      description: "Manual IATA code — verify before publishing",
      manual: true,
    });
  }
  return results.slice(0, Math.max(0, limit));
}
