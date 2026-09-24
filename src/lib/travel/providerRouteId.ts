/** Decode a provider result route segment once before cache lookup or API encoding. */
export function decodeProviderRouteId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}
