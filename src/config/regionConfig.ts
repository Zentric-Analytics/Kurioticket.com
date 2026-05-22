export type CountryCurrencyOption = {
  code: string;
  country: string;
  currency: string;
};

export const countryCurrencyOptions: CountryCurrencyOption[] = [
  { code: "US", country: "United States", currency: "USD" },
  { code: "GB", country: "United Kingdom", currency: "GBP" },
  { code: "EU", country: "Europe", currency: "EUR" },
  { code: "CA", country: "Canada", currency: "CAD" },
  { code: "AU", country: "Australia", currency: "AUD" },
  { code: "JP", country: "Japan", currency: "JPY" },
  { code: "BR", country: "Brazil", currency: "BRL" },
  { code: "IN", country: "India", currency: "INR" },
];

export const REGION_COOKIE_KEY = "ct_region";
export const REGION_STORAGE_KEY = "ct_region";
