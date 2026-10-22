import { searchLocationSchema, type SearchLocation } from "@/lib/locations/searchTarget";

export function parseCarLocationTarget(
  value: string | null | undefined,
): SearchLocation | undefined {
  const serialized = value?.trim();
  if (!serialized) return undefined;
  try {
    const parsed = searchLocationSchema.safeParse(JSON.parse(serialized));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function serializeCarLocationTarget(
  location: SearchLocation | undefined,
): string | undefined {
  return location ? JSON.stringify(location) : undefined;
}
