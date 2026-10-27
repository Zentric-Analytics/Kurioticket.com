import type { ProviderResult } from "@/lib/types";

/** A partial search returned usable offers despite a provider failure. */
export function hotelSearchRecordedStatus(
  providers: readonly Pick<ProviderResult<unknown>, "status">[],
  resultCount: number,
): "SUCCESS" | "PARTIAL" | "FAILED" {
  const failed = providers.some(provider => provider.status === "failed");
  if (failed) return resultCount > 0 ? "PARTIAL" : "FAILED";
  return "SUCCESS";
}
