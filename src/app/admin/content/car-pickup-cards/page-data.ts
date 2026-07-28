import { pickupCards, type CarPickupCard } from "@/data/carsLandingContent";
import { imageLocalPatterns, imageRemotePatterns, matchesImagePattern } from "@/config/imagePatterns";

export type CarPickupImageValidation =
  | "valid-local-image"
  | "permitted-external-image"
  | "malformed-image-value"
  | "unsupported-image-protocol"
  | "external-image-host-not-permitted"
  | "external-image-pathname-not-permitted";

export type CarPickupCardInventoryRow = CarPickupCard & {
  rowId: string;
  duplicatePickupLocation: boolean;
  duplicateTranslationKey: boolean;
  duplicateImage: boolean;
  missingTranslationKey: boolean;
  missingImage: boolean;
  invalidImage: boolean;
  imageValidation: CarPickupImageValidation;
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

export function validateCarPickupImage(value: string): CarPickupImageValidation {
  const image = value.trim();
  if (!image || image.startsWith("//")) return "malformed-image-value";
  if (image.startsWith("/")) {
    const url = new URL(image, "https://local.invalid");
    return imageLocalPatterns.some((pattern) => matchesImagePattern(url, pattern))
      ? "valid-local-image"
      : "malformed-image-value";
  }

  let url: URL;
  try {
    url = new URL(image);
  } catch {
    return "malformed-image-value";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "unsupported-image-protocol";
  const protocolPatterns = imageRemotePatterns.filter((pattern) => pattern.protocol === url.protocol.slice(0, -1));
  if (!protocolPatterns.length) return "unsupported-image-protocol";
  if (!protocolPatterns.some((pattern) => pattern.hostname === url.hostname)) return "external-image-host-not-permitted";
  return protocolPatterns.some((pattern) => matchesImagePattern(url, pattern))
    ? "permitted-external-image"
    : "external-image-pathname-not-permitted";
}

export function isValidCarPickupImage(value: string) {
  return ["valid-local-image", "permitted-external-image"].includes(validateCarPickupImage(value));
}

export function selectCarPickupCardRows(cards: CarPickupCard[] = pickupCards): CarPickupCardInventoryRow[] {
  const locations = repeatedValues(cards, (card) => card.pickupLocation);
  const translationKeys = repeatedValues(cards, (card) => card.translationKey);
  const images = repeatedValues(cards, (card) => card.image);

  return cards.map((card, index) => {
    const missingImage = !card.image.trim();
    const imageValidation = validateCarPickupImage(card.image);
    return {
      ...card,
      rowId: `${index}:${card.translationKey || card.pickupLocation || "pickup-card"}`,
      duplicatePickupLocation: locations.has(normalizedText(card.pickupLocation)),
      duplicateTranslationKey: translationKeys.has(normalizedText(card.translationKey)),
      duplicateImage: images.has(normalizedText(card.image)),
      missingTranslationKey: !card.translationKey.trim(),
      missingImage,
      imageValidation,
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
