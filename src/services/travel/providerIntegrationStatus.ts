import {
  getDuffelApiMode,
  type DuffelApiMode,
} from "@/lib/env";
import { isKayakSandboxEnabled } from "./kayakSandbox";
import { getDuffelProviderBlockReason } from "./providers/duffelProvider";

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
  duffelApiMode: DuffelApiMode;
  duffelConfigured: boolean;
  duffelBlockReason: string | null;
  kayakConfigured: boolean;
  kayakRequested: boolean;
  kayakEnabled: boolean;
};

/**
 * Produces a secret-free readiness record. The caller supplies the exact
 * side-effect-free Duffel gate used by the live provider path; this function
 * does not spend provider quota or claim that a network health check succeeded.
 */
export function evaluateProviderIntegrationStatuses(
  environment: ProviderIntegrationEnvironment,
): ProviderIntegrationStatus[] {
  const duffelState: ProviderIntegrationState = !environment.duffelConfigured
    ? "NOT_CONFIGURED"
    : environment.duffelBlockReason
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
    bookingEnabled: false,
    environment: environment.duffelApiMode === "test" ? "test" : "live",
    note: !environment.duffelConfigured
      ? "Flight provider credentials are not configured."
      : environment.duffelBlockReason
        ? "Duffel is configured but blocked by the current environment safety policy."
        : "Flight search is ready. Direct Duffel booking is not implemented.",
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
  const duffelApiKey = process.env.DUFFEL_API_KEY?.trim() || "";

  return evaluateProviderIntegrationStatuses({
    duffelApiMode: getDuffelApiMode(),
    duffelConfigured: Boolean(duffelApiKey),
    duffelBlockReason: duffelApiKey
      ? getDuffelProviderBlockReason(duffelApiKey) || null
      : null,
    kayakConfigured: Boolean(process.env.KAYAK_SANDBOX_API_KEY?.trim()),
    kayakRequested: process.env.KAYAK_SANDBOX_ENABLED === "true",
    kayakEnabled: isKayakSandboxEnabled(),
  });
}
