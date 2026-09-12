/** Public supplier media only. Never forward API/detail URLs or credentials. */
export function kayakImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return undefined;
    if (!(url.hostname === "content.r9cdn.net" || url.hostname === "www.kayak.com" || url.hostname === "www.kayak.ch")) return undefined;
    if (/api[-_]?key|authorization|access[-_]?token/i.test(decodeURIComponent(url.search))) return undefined;
    if (url.hostname !== "content.r9cdn.net" && url.pathname !== "/h/run/api/image") return undefined;
    return url.href;
  } catch { return undefined; }
}

export type KayakImage = { url: string; alt: string };
export type KayakAttribute = { label: string; value: string };

/** Explicit customer-facing fields only; transport objects and URLs never pass through. */
export function kayakAttributes(value: Record<string, unknown>, keys: string[]): KayakAttribute[] {
  const output: KayakAttribute[] = [];
  const visit = (label: string, item: unknown, depth: number) => {
    if (depth > 6 || /url|uri|token|key|reference|tracking/i.test(label)) return;
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      const text = String(item).trim();
      if (text && !/https?:\/\/|api[-_]?key|access[-_]?token|authorization/i.test(text)) output.push({label:label.replace(/([a-z])([A-Z])/g,"$1 $2"), value:typeof item === "boolean" ? item ? "Yes" : "No" : text});
    } else if (Array.isArray(item)) item.forEach((entry,index) => visit(`${label} ${index+1}`,entry,depth+1));
    else if (item && typeof item === "object") Object.entries(item).forEach(([key,entry]) => visit(`${label} · ${key}`,entry,depth+1));
  };
  keys.forEach(key => visit(key,value[key],0));
  return output;
}

export type KayakFlightLeg = {
  durationMinutes?: number;
  segments: { origin: string; destination: string; departure: string; arrival: string;
    airline: string; airlineLogo?: string; flightNumber: string; operatingDisclosure?: string }[];
};

export function kayakFlightLegs(data: Record<string, unknown>, result: Record<string, unknown>): KayakFlightLeg[] {
  const obj = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
  const str = (value: unknown) => typeof value === "string" ? value : "";
  return (Array.isArray(result.legs) ? result.legs : []).map(reference => {
    const leg = obj(obj(data.legs)[str(obj(reference).id)]);
    return {
      durationMinutes: typeof leg.duration === "number" && leg.duration >= 0 ? leg.duration : undefined,
      segments: (Array.isArray(leg.segments) ? leg.segments : []).map(reference => {
        const segment = obj(obj(data.segments)[str(obj(reference).id)]);
        const airline = obj(obj(data.airlines)[str(segment.airline)]);
        return { origin: str(segment.origin), destination: str(segment.destination),
          departure: str(segment.departureTime), arrival: str(segment.arrivalTime),
          airline: str(airline.displayName) || str(segment.airline), airlineLogo: kayakImageUrl(airline.logoUrl),
          flightNumber: [str(segment.airline), str(segment.flightNumber)].filter(Boolean).join(" "),
          operatingDisclosure: str(segment.operationalDisplay) || undefined };
      }),
    };
  });
}

export function kayakImages(vertical: string, result: Record<string, unknown>, car: Record<string, unknown>, title: string): KayakImage[] {
  const candidates = vertical === "hotels" && Array.isArray(result.images)
    ? result.images.map(value => value && typeof value === "object" ? (value as Record<string, unknown>).large : undefined)
    : vertical === "cars" ? [car.image] : [];
  return [...new Set(candidates.map(kayakImageUrl).filter((url): url is string => Boolean(url)))].map(url => ({ url, alt: title }));
}
