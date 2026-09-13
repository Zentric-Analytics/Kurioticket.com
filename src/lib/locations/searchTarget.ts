import { z } from "zod";

/** The portable web/native selection contract. It deliberately contains no secrets. */
export const searchLocationSchema = z.object({
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
});

export type SearchLocation = z.infer<typeof searchLocationSchema>;

export function verifiedProviderValue(location: SearchLocation | undefined, provider: string) {
  const matches = location?.providerBindings.filter(binding =>
    binding.provider.toLocaleLowerCase("en-US") === provider.toLocaleLowerCase("en-US") && binding.verification === "verified",
  ) ?? [];
  return matches.length === 1 ? matches[0].value : undefined;
}
