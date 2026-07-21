import { mobileApiSuccess } from "@/lib/mobile-api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const mobileApiV1Config = {
  apiVersion: "v1",
  minimumSupportedAppVersion: null,
  latestAppVersion: null,
  maintenanceMode: false,
  features: {
    flights: true,
    hotels: false,
    cars: false,
    pushNotifications: false,
    socialAuthentication: false,
    premiumSubscriptions: false,
  },
} as const;

export async function GET() {
  return mobileApiSuccess(mobileApiV1Config);
}
