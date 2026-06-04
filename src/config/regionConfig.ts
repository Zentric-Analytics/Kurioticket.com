import { supportedRegions } from "@/lib/region/supportedRegions";

export type CountryCurrencyOption = {
  code: string;
  country: string;
  currency: string;
};

export const countryCurrencyOptions: CountryCurrencyOption[] = supportedRegions;

export const REGION_COOKIE_KEY = "ct_region";
export const REGION_STORAGE_KEY = "ct_region";
export const REGION_OVERRIDE_COOKIE_KEY = "kurioticket_region_override";
export const REGION_OVERRIDE_STORAGE_KEY = "kurioticket_region_override";
