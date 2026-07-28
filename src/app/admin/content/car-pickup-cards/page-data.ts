import { pickupCards, type CarPickupCard } from "@/data/carsLandingContent";

export type CarPickupCardInventoryRow = CarPickupCard & {
  rowId: string;
  duplicatePickupLocation: boolean;
  duplicateTranslationKey: boolean;
  duplicateImage: boolean;
  missingTranslationKey: boolean;
  missingImage: boolean;
  invalidImage: boolean;
};

const normalizedText = (value: string) => value.trim().toLocaleLowerCase();

function repeatedValues(cards: CarPickupCard[], selector: (card: CarPickupCard) => string) {
  const counts = new Map<string, number>();
  for (const card of cards) {
    const value = normalizedText(selector(card));
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([value]) => value));
}

export function isValidCarPickupImage(value: string) {
  const image = value.trim();
  if (!image) return false;
  if (image.startsWith("/") && !image.startsWith("//")) return true;

  try {
    const url = new URL(image);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function selectCarPickupCardRows(cards: CarPickupCard[] = pickupCards): CarPickupCardInventoryRow[] {
  const locations = repeatedValues(cards, (card) => card.pickupLocation);
  const translationKeys = repeatedValues(cards, (card) => card.translationKey);
  const images = repeatedValues(cards, (card) => card.image);

  return cards.map((card, index) => {
    const missingImage = !card.image.trim();
    return {
      ...card,
      rowId: `${index}:${card.translationKey || card.pickupLocation || "pickup-card"}`,
      duplicatePickupLocation: locations.has(normalizedText(card.pickupLocation)),
      duplicateTranslationKey: translationKeys.has(normalizedText(card.translationKey)),
      duplicateImage: images.has(normalizedText(card.image)),
      missingTranslationKey: !card.translationKey.trim(),
      missingImage,
      invalidImage: !missingImage && !isValidCarPickupImage(card.image),
    };
  });
}

export function getCarPickupCardSummary(rows = selectCarPickupCardRows()) {
  return {
    pickupCards: rows.length,
    uniquePickupLocations: new Set(rows.map((row) => normalizedText(row.pickupLocation)).filter(Boolean)).size,
    configuredImages: rows.filter((row) => !row.missingImage && !row.invalidImage).length,
    publicUsage: "Cars landing",
  };
}

export function getCarPickupImageSource(image: string) {
  if (!isValidCarPickupImage(image)) return image.trim() || "Not configured";
  if (image.trim().startsWith("/")) return "Local asset";
  return new URL(image.trim()).hostname;
}

export function hasCarPickupCardIssues(row: CarPickupCardInventoryRow) {
  return row.duplicatePickupLocation
    || row.duplicateTranslationKey
    || row.duplicateImage
    || row.missingTranslationKey
    || row.missingImage
    || row.invalidImage;
}
