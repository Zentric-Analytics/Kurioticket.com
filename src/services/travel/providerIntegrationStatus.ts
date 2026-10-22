import {
  getDuffelApiMode,
  getTravelProviderMode,
  type DuffelApiMode,
  type TravelProviderMode,
} from "@/lib/env";
import { getStagingProviderSafety } from "@/lib/stagingSafety";
import { isKayakSandboxEnabled } from "./kayakSandbox";

export type ProviderIntegrationState =
  | "READY"
  | "DISABLED"
  | "NOT_CONFIGURED"
  | "ENVIRONMENT_BLOCKED";

export type ProviderIntegrationStatus = {
  id: "duffel" | "kayak-sandbox";
  provider: string;
  products: Array<"FLIGHTS" | "HOTELS" | "CARS">;
  state: ProviderIntegrationState;
  configured: boolean;
  searchEnabled: boolean;
  externalHandoffEnabled: boolean;
  bookingEnabled: boolean;
  environment: string;
  note: string;
};

export type ProviderIntegrationEnvironment = {
  travelProviderMode: TravelProviderMode;
  duffelApiMode: DuffelApiMode;
  duffelConfigured: boolean;
  duffelBookingEnabled: boolean;
  duffelEnvironmentSafe: boolean;
  kayakConfigured: boolean;
  kayakRequested: boolean;
  kayakEnabled: boolean;
};

/**
 * Produces a secret-free readiness record. This deliberately evaluates
 * configuration and safety gates only; it does not spend provider quota or
 * claim that a network health check succeeded.
 */
export function evaluateProviderIntegrationStatuses(
  environment: ProviderIntegrationEnvironment,
): ProviderIntegrationStatus[] {
  const duffelBlockedInProduction =
    environment.travelProviderMode === "production" &&
    environment.duffelApiMode !== "live";
  const duffelState: ProviderIntegrationState = !environment.duffelConfigured
    ? "NOT_CONFIGURED"
    : duffelBlockedInProduction || !environment.duffelEnvironmentSafe
      ? "ENVIRONMENT_BLOCKED"
      : "READY";

  const duffel: ProviderIntegrationStatus = {
    id: "duffel",
    provider: "Duffel",
    products: ["FLIGHTS"],
    state: duffelState,
    configured: environment.duffelConfigured,
    searchEnabled: duffelState === "READY",
    externalHandoffEnabled: false,
    bookingEnabled: duffelState === "READY" && environment.duffelBookingEnabled,
    environment: environment.duffelApiMode === "test" ? "test" : "live",
    note: !environment.duffelConfigured
      ? "Flight provider credentials are not configured."
      : duffelBlockedInProduction
        ? "Duffel test mode is blocked in production."
        : !environment.duffelEnvironmentSafe
          ? "The staging provider safety requirements are not satisfied."
          : environment.duffelBookingEnabled
            ? "Flight search and the explicitly enabled booking workflow are ready."
            : "Flight search is ready; booking remains disabled until an approved workflow is enabled.",
  };

  const kayakState: ProviderIntegrationState = !environment.kayakConfigured
    ? "NOT_CONFIGURED"
    : !environment.kayakRequested
      ? "DISABLED"
      : !environment.kayakEnabled
        ? "ENVIRONMENT_BLOCKED"
        : "READY";
  const kayak: ProviderIntegrationStatus = {
    id: "kayak-sandbox",
    provider: "KAYAK sandbox",
    products: ["FLIGHTS", "HOTELS", "CARS"],
    state: kayakState,
    configured: environment.kayakConfigured,
    searchEnabled: kayakState === "READY",
    externalHandoffEnabled: kayakState === "READY",
    bookingEnabled: false,
    environment: "sandbox",
    note: !environment.kayakConfigured
      ? "KAYAK sandbox credentials are not configured."
      : !environment.kayakRequested
        ? "KAYAK sandbox is configured but intentionally disabled."
        : !environment.kayakEnabled
          ? "KAYAK sandbox is limited to the approved staging or local-development host."
          : "Sandbox search and labeled test handoffs are ready; no real booking is enabled.",
  };

  return [duffel, kayak];
}

export function getProviderIntegrationStatuses(): ProviderIntegrationStatus[] {
  return evaluateProviderIntegrationStatuses({
    travelProviderMode: getTravelProviderMode(),
    duffelApiMode: getDuffelApiMode(),
    duffelConfigured: Boolean(process.env.DUFFEL_API_KEY?.trim()),
    duffelBookingEnabled: process.env.DUFFEL_BOOKING_ENABLED === "true",
    duffelEnvironmentSafe: getStagingProviderSafety().safe,
    kayakConfigured: Boolean(process.env.KAYAK_SANDBOX_API_KEY?.trim()),
    kayakRequested: process.env.KAYAK_SANDBOX_ENABLED === "true",
    kayakEnabled: isKayakSandboxEnabled(),
  });
}
