import { mobileApiSuccess } from "@/lib/mobile-api/response";
import { getPublicEnvironment, isStagingEnvironment } from "@/lib/stagingSafety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function getMobileApiV1Config() { return {
  apiVersion: "v1",
  environment: getPublicEnvironment(),
  minimumSupportedAppVersion: null,
  latestAppVersion: null,
  maintenanceMode: false,
  features: {
    flights: true,
    hotels: false,
    cars: false,
    pushNotifications: false,
    socialAuthentication: true,
    externalCheckout: !isStagingEnvironment(),
  },
} as const; }

export async function GET() {
  return mobileApiSuccess(getMobileApiV1Config());
}
