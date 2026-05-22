export type RegionMode = "GLOBAL" | "NG";

export type RegionFlags = {
  assistedBooking: boolean;
  whatsappSupport: boolean;
  localCurrency: boolean;
  officeSupport: boolean;
  trustMessaging: boolean;
};

export const regionConfig: Record<RegionMode, RegionFlags> = {
  GLOBAL: {
    assistedBooking: false,
    whatsappSupport: false,
    localCurrency: false,
    officeSupport: false,
    trustMessaging: false,
  },
  NG: {
    assistedBooking: true,
    whatsappSupport: true,
    localCurrency: true,
    officeSupport: true,
    trustMessaging: true,
  },
};

export const REGION_COOKIE_KEY = "ct_region";
export const REGION_STORAGE_KEY = "ct_region";
