function normalizeLocation(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function buildGoogleCarMapEmbedUrl({
  pickupLocation,
  googleMapsEmbedApiKey,
}: {
  pickupLocation: string;
  googleMapsEmbedApiKey?: string;
}): string | null {
  const apiKey = googleMapsEmbedApiKey?.trim();
  const query = normalizeLocation(pickupLocation);
  if (!apiKey || !query) return null;

  const url = new URL("https://www.google.com/maps/embed/v1/place");
  url.search = new URLSearchParams({
    key: apiKey,
    q: query,
    zoom: "13",
    maptype: "roadmap",
  }).toString();
  return url.toString();
}

export function buildCarDirectionsUrl(pickupLocation: string): string | null {
  const destination = normalizeLocation(pickupLocation);
  if (!destination) return null;

  const url = new URL("https://www.google.com/maps/dir/");
  url.search = new URLSearchParams({
    api: "1",
    destination,
  }).toString();
  return url.toString();
}
