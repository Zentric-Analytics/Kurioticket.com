import { z } from "zod";

export type SearchLocationKind = "airport" | "city" | "district" | "landmark" | "rental-area" | "custom";
export type SearchLocationProviderBinding = {
  provider: string;
  value: string;
  kind?: string;
  verification: "verified" | "unverified";
  provenance: "provider-discovery" | "catalogue" | "operator";
};

/** Portable web/native selection contract. It deliberately contains no secrets. */
export type SearchLocation = {
  id: string;
  kind: SearchLocationKind;
  primaryLabel: string;
  supportingLabel: string;
  submittedValue: string;
  country?: { code?: string; name?: string };
  region?: string;
  coordinates?: { latitude: number; longitude: number };
  codes?: { iata?: string; icao?: string };
  providerBindings: SearchLocationProviderBinding[];
  verification: "verified" | "catalogue-only";
  /** Opaque server-issued handle. Provider identifiers never need to cross the client boundary. */
  selectionToken?: string;
};

export const searchLocationSchema: z.ZodType<SearchLocation> = z.object({
  id: z.string().trim().min(1).max(160),
  kind: z.enum(["airport", "city", "district", "landmark", "rental-area", "custom"]),
  primaryLabel: z.string().trim().min(1).max(160),
  supportingLabel: z.string().trim().max(200).default(""),
  submittedValue: z.string().trim().min(1).max(160),
  country: z.object({ code: z.string().trim().max(3).optional(), name: z.string().trim().max(100).optional() }).optional(),
  region: z.string().trim().max(100).optional(),
  coordinates: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).optional(),
  codes: z.object({ iata: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3}$/).optional(), icao: z.string().trim().toUpperCase().max(4).optional() }).optional(),
  providerBindings: z.array(z.object({
    provider: z.string().trim().min(1).max(40), value: z.string().trim().min(1).max(180), kind: z.string().trim().max(40).optional(),
    verification: z.enum(["verified", "unverified"]), provenance: z.enum(["provider-discovery", "catalogue", "operator"]),
  })).max(12).default([]),
  verification: z.enum(["verified", "catalogue-only"]).default("catalogue-only"),
  selectionToken: z.string().trim().min(20).max(200).optional(),
});

export function verifiedProviderValue(location: SearchLocation | undefined, provider: string) {
  // Client-carried bindings are display data, never provider authority.
  void location; void provider;
  return undefined;
}
