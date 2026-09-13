/** Public supplier media only. Never forward API/detail URLs or credentials. */
export function kayakImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return undefined;
    const sandboxImage = url.hostname === "sandbox-en-us.kayakaffiliates.com" && url.pathname.startsWith("/himg/") && !url.search;
    if (!(sandboxImage || url.hostname === "content.r9cdn.net" || url.hostname === "www.kayak.com" || url.hostname === "www.kayak.ch")) return undefined;
    if (/api[-_]?key|authorization|access[-_]?token/i.test(decodeURIComponent(url.search))) return undefined;
    if (!sandboxImage && url.hostname !== "content.r9cdn.net" && url.pathname !== "/h/run/api/image") return undefined;
    return url.href;
  } catch { return undefined; }
}

export type KayakImage = { url: string; alt: string };
export type KayakAttribute = { label: string; value: string };

export function kayakHotelAmenities(features: unknown, mapping: unknown): string[] {
  const dictionary = new Map<number, string>();
  if (Array.isArray(mapping)) for (const entry of mapping) {
    if (entry && typeof entry.id === "number" && typeof entry.name === "string" && entry.name.trim()) {
      dictionary.set(entry.id, entry.name.trim());
    }
  }
  return Array.isArray(features) ? [...new Set(features.map(id => dictionary.get(id)).filter((name): name is string => Boolean(name)))] : [];
}

export function kayakHotelAmenityStatus(features: unknown, mapping: unknown): string {
  if (!Array.isArray(features) || !features.length) return "Amenities not supplied by provider";
  const ids = new Set(Array.isArray(mapping) ? mapping.filter(entry => entry && typeof entry.name === "string" && entry.name.trim()).map(entry => entry.id) : []);
  const missing = new Set(features.filter(id => !ids.has(id))).size;
  return missing ? `${missing} additional amenity descriptions unavailable from provider` : "All supplied amenities listed";
}

/** Only explicitly supplied specifications may participate in shared filters. */
export function kayakCarFilterOptions(car: Record<string, unknown>): string[] {
  const options: string[] = [];
  const type = car.type && typeof car.type === "object" ? car.type as Record<string, unknown> : {};
  const category = typeof type.displayName === "string" ? type.displayName.trim().toLowerCase() : "";
  const categories: Record<string, string> = {
    mini:"smallCars", economy:"smallCars", compact:"smallCars",
    intermediate:"mediumCars", standard:"mediumCars", "full-size":"mediumCars", "full size":"mediumCars",
    suv:"suvs", "compact suv":"suvs", "intermediate suv":"suvs", "standard suv":"suvs", "full-size suv":"suvs", "premium suv":"suvs",
    luxury:"luxuryCars", premium:"luxuryCars", van:"vans", minivan:"vans", "passenger van":"vans",
  };
  if (categories[category]) options.push(categories[category]);
  if (car.transmission === "automatic" || car.transmission === "manual") options.push(car.transmission);
  for (const count of [4, 5, 7]) {
    if (typeof car.passengers === "number" && Number.isFinite(car.passengers) && car.passengers >= count) options.push(`seats${count}Plus`);
  }
  for (const count of [2, 3, 4]) {
    if (typeof car.bags === "number" && Number.isFinite(car.bags) && car.bags >= count) options.push(`bags${count}Plus`);
  }
  return options;
}

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

export function kayakFlightCabin(data: Record<string, unknown>, result: Record<string, unknown>, option: Record<string, unknown>): string | undefined {
  const obj = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
  const ids = (Array.isArray(result.legs) ? result.legs : []).flatMap(reference => {
    const leg = obj(obj(data.legs)[String(obj(reference).id)]);
    return (Array.isArray(leg.segments) ? leg.segments : []).map(segment=>obj(segment).id);
  });
  const fares = Array.isArray(option.segmentFares) ? option.segmentFares : [];
  const cabins = ids.map(id => {
    const matches = fares.filter(fare=>typeof id === "string" && obj(fare).segmentId === id);
    if (matches.length !== 1) return undefined;
    const name = obj(obj(matches[0]).cabin).displayName;
    return typeof name === "string" && name.trim() ? name.trim() : undefined;
  });
  return cabins.length && cabins.every(Boolean) ? [...new Set(cabins)].join(" / ") : undefined;
}

/** Customer-facing segment facts and airline rules, not purchased fare entitlements. */
export function kayakFlightAttributes(data: Record<string, unknown>, result: Record<string, unknown>): KayakAttribute[] {
  const obj = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const rows: KayakAttribute[] = [];
  const seenAirlines = new Set<string>();
  for (const [legIndex, reference] of (Array.isArray(result.legs) ? result.legs : []).entries()) {
    const leg = obj(obj(data.legs)[String(obj(reference).id)]);
    for (const [segmentIndex, reference] of (Array.isArray(leg.segments) ? leg.segments : []).entries()) {
      const segment = obj(obj(data.segments)[String(obj(reference).id)]);
      rows.push(...kayakAttributes(segment, ["equipmentTypeName", "duration", "type"]).map(attribute => ({...attribute,label:`Leg ${legIndex+1}, segment ${segmentIndex+1} · ${attribute.label}${attribute.label === "duration" ? " (minutes)" : ""}`})));
      const airlineCode = typeof segment.airline === "string" ? segment.airline : "";
      if (airlineCode && !seenAirlines.has(airlineCode)) {
        seenAirlines.add(airlineCode);
        rows.push(...kayakAttributes(obj(obj(data.airlines)[airlineCode]), ["baggagePolicies"]).map(attribute => ({...attribute,label:`${airlineCode} airline policy (not included allowance) · ${attribute.label}`})));
      }
    }
  }
  return rows;
}

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
  const candidates = vertical === "hotels"
    ? [...(Array.isArray(result.images) ? result.images : []), result.image].map(value => value && typeof value === "object" ? (value as Record<string, unknown>).large : undefined)
    : vertical === "cars" ? [car.image] : [];
  return [...new Set(candidates.map(kayakImageUrl).filter((url): url is string => Boolean(url)))].map(url => ({ url, alt: title }));
}
