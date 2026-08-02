export type DestinationImageRecord = {
  destinationId: string;
  name: string;
  country: string;
  imageUrl: string;
  labelAliases?: readonly { name: string; country: string }[];
};

/** Curated website photography, keyed by stable cross-platform destination IDs. */
export const CURATED_DESTINATION_IMAGES: readonly DestinationImageRecord[] = [
  { destinationId: "gb-london", name: "London", country: "United Kingdom", imageUrl: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "fr-paris", name: "Paris", country: "France", imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "ae-dubai", name: "Dubai", country: "United Arab Emirates", imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "us-new-york", name: "New York", country: "United States", imageUrl: "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "it-rome", name: "Rome", country: "Italy", imageUrl: "https://images.unsplash.com/photo-1525874684015-58379d421a52?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "es-barcelona", name: "Barcelona", country: "Spain", imageUrl: "https://images.unsplash.com/photo-1583422409516-2895a77efded?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "nl-amsterdam", name: "Amsterdam", country: "Netherlands", imageUrl: "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "jp-tokyo", name: "Tokyo", country: "Japan", imageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "sg-singapore", name: "Singapore", country: "Singapore", imageUrl: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "th-bangkok", name: "Bangkok", country: "Thailand", imageUrl: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "za-cape-town", name: "Cape Town", country: "South Africa", imageUrl: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "tr-istanbul", name: "Istanbul", country: "Turkey", imageUrl: "https://images.unsplash.com/photo-1527838832700-5059252407fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95", labelAliases: [{ name: "Istanbul", country: "Türkiye" }] },
  { destinationId: "us-las-vegas", name: "Las Vegas", country: "United States", imageUrl: "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "ca-toronto", name: "Toronto", country: "Canada", imageUrl: "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "us-los-angeles", name: "Los Angeles", country: "United States", imageUrl: "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "us-miami", name: "Miami", country: "United States", imageUrl: "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "qa-doha", name: "Doha", country: "Qatar", imageUrl: "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "ae-abu-dhabi", name: "Abu Dhabi", country: "United Arab Emirates", imageUrl: "https://images.unsplash.com/photo-1518684079-3c830dcef090?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "pt-lisbon", name: "Lisbon", country: "Portugal", imageUrl: "https://images.unsplash.com/photo-1501927023255-9063be98970c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "cz-prague", name: "Prague", country: "Czechia", imageUrl: "https://images.unsplash.com/photo-1541849546-216549ae216d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "gr-athens", name: "Athens", country: "Greece", imageUrl: "https://images.unsplash.com/photo-1555993539-1732b0258235?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "ma-marrakesh", name: "Marrakech", country: "Morocco", imageUrl: "https://images.pexels.com/photos/31356131/pexels-photo-31356131.jpeg?auto=compress&cs=tinysrgb&w=1800", labelAliases: [{ name: "Marrakesh", country: "Morocco" }] },
  { destinationId: "ke-nairobi", name: "Nairobi", country: "Kenya", imageUrl: "https://images.unsplash.com/photo-1523805009345-7448845a9e53?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "my-kuala-lumpur", name: "Kuala Lumpur", country: "Malaysia", imageUrl: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "it-venice", name: "Venice", country: "Italy", imageUrl: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "it-florence", name: "Florence", country: "Italy", imageUrl: "https://images.unsplash.com/photo-1543429257-3eb0b65d9c58?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "de-berlin", name: "Berlin", country: "Germany", imageUrl: "https://images.unsplash.com/photo-1560969184-10fe8719e047?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "es-madrid", name: "Madrid", country: "Spain", imageUrl: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "dk-copenhagen", name: "Copenhagen", country: "Denmark", imageUrl: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "ch-zurich", name: "Zurich", country: "Switzerland", imageUrl: "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "at-vienna", name: "Vienna", country: "Austria", imageUrl: "https://images.unsplash.com/photo-1516550893923-42d28e5677af?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "it-milan", name: "Milan", country: "Italy", imageUrl: "https://images.unsplash.com/photo-1520440229-6469a149ac59?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "gh-accra", name: "Accra", country: "Ghana", imageUrl: "https://images.pexels.com/photos/31781975/pexels-photo-31781975.jpeg?auto=compress&cs=tinysrgb&w=1800" },
  { destinationId: "ng-lagos", name: "Lagos", country: "Nigeria", imageUrl: "https://images.pexels.com/photos/32014864/pexels-photo-32014864.jpeg?auto=compress&cs=tinysrgb&w=1800" },
  { destinationId: "ng-abuja", name: "Abuja", country: "Nigeria", imageUrl: "https://images.pexels.com/photos/20453360/pexels-photo-20453360.jpeg?auto=compress&cs=tinysrgb&w=1800" },
  { destinationId: "om-muscat", name: "Muscat", country: "Oman", imageUrl: "https://images.pexels.com/photos/30798979/pexels-photo-30798979.jpeg?auto=compress&cs=tinysrgb&w=1800" },
  { destinationId: "sa-jeddah", name: "Jeddah", country: "Saudi Arabia", imageUrl: "https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "ca-vancouver", name: "Vancouver", country: "Canada", imageUrl: "https://images.unsplash.com/photo-1578922746465-3a80a228f223?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "us-chicago", name: "Chicago", country: "United States", imageUrl: "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "us-san-francisco", name: "San Francisco", country: "United States", imageUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "kr-seoul", name: "Seoul", country: "South Korea", imageUrl: "https://images.pexels.com/photos/32196432/pexels-photo-32196432.jpeg?auto=compress&cs=tinysrgb&w=1800" },
  { destinationId: "jp-osaka", name: "Osaka", country: "Japan", imageUrl: "https://images.unsplash.com/photo-1590559899731-a382839e5549?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "id-bali", name: "Bali", country: "Indonesia", imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
  { destinationId: "th-phuket", name: "Phuket", country: "Thailand", imageUrl: "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1800&q=95" },
] as const;

export function createDestinationImageRegistry(records: readonly DestinationImageRecord[]) {
  const registry = new Map<string, DestinationImageRecord>();
  const labels = new Map<string, string>();
  for (const record of records) {
    if (registry.has(record.destinationId)) throw new Error(`Duplicate destination image ID: ${record.destinationId}`);
    if (!record.imageUrl.startsWith("https://")) throw new Error(`Destination image must use HTTPS: ${record.destinationId}`);
    registry.set(record.destinationId, record);
    for (const label of [{ name: record.name, country: record.country }, ...(record.labelAliases ?? [])]) {
      const key = `${label.name}|${label.country}`;
      const existing = labels.get(key);
      if (existing && existing !== record.destinationId) throw new Error(`Duplicate destination image label: ${key}`);
      labels.set(key, record.destinationId);
    }
  }
  return { registry, labels };
}

const destinationImages = createDestinationImageRegistry(CURATED_DESTINATION_IMAGES);
export const destinationImageById = destinationImages.registry;

export function curatedDestinationImage(destinationId: string) {
  return destinationImageById.get(destinationId);
}

/** Exact compatibility lookup; aliases are intentional rather than fuzzy matches. */
export function curatedDestinationImageByLabel(name: string, country: string) {
  const destinationId = destinationImages.labels.get(`${name}|${country}`);
  return destinationId ? destinationImageById.get(destinationId) : undefined;
}

export function requireCuratedDestinationImage(name: string, country: string) {
  const image = curatedDestinationImageByLabel(name, country);
  if (!image) throw new Error(`Unknown destination image mapping: ${name}, ${country}`);
  return image;
}
