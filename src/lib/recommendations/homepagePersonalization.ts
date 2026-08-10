export type HomepageSavedItemSignal = {
  destination?: string | null;
  linkedSearchDestination?: string | null;
};

function normalizeDestinationCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return /^[A-Z0-9]{2,8}$/.test(normalized) ? normalized : null;
}

export function getSavedItemHomepageDestinationCodes(
  savedItems: readonly HomepageSavedItemSignal[],
) {
  const savedItemDestinations: string[] = [];
  const linkedSearchDestinations: string[] = [];
  const seenSavedItemDestinations = new Set<string>();
  const seenLinkedSearchDestinations = new Set<string>();

  for (const trip of savedItems) {
    const destination = normalizeDestinationCode(trip.destination);
    if (destination && !seenSavedItemDestinations.has(destination)) {
      seenSavedItemDestinations.add(destination);
      savedItemDestinations.push(destination);
    }

    const linkedSearchDestination = normalizeDestinationCode(
      trip.linkedSearchDestination,
    );
    if (
      linkedSearchDestination &&
      !seenSavedItemDestinations.has(linkedSearchDestination) &&
      !seenLinkedSearchDestinations.has(linkedSearchDestination)
    ) {
      seenLinkedSearchDestinations.add(linkedSearchDestination);
      linkedSearchDestinations.push(linkedSearchDestination);
    }
  }

  return [...savedItemDestinations, ...linkedSearchDestinations];
}

export function reorderHomepageCardsBySavedItemDestinations<T>(
  cards: readonly T[],
  destinationCodes: readonly string[],
  getDestinationCode: (card: T) => string | null | undefined,
): T[] {
  if (!cards.length || !destinationCodes.length) return [...cards];

  const priorityByDestination = new Map<string, number>();
  destinationCodes.forEach((destination, index) => {
    const normalized = normalizeDestinationCode(destination);
    if (normalized && !priorityByDestination.has(normalized)) {
      priorityByDestination.set(normalized, index);
    }
  });

  if (!priorityByDestination.size) return [...cards];

  return cards
    .map((card, index) => {
      const destination = normalizeDestinationCode(getDestinationCode(card));
      return {
        card,
        index,
        priority:
          destination && priorityByDestination.has(destination)
            ? priorityByDestination.get(destination) ?? Number.MAX_SAFE_INTEGER
            : Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((first, second) => first.priority - second.priority || first.index - second.index)
    .map(({ card }) => card);
}

export function applyHomepageRecommendationOrder<T>(
  cards: readonly T[],
  orderedIds: readonly string[] | null | undefined,
  getId: (card: T) => string,
): T[] {
  if (!cards.length || !orderedIds?.length) return [...cards];

  const cardById = new Map(cards.map((card) => [getId(card), card]));
  const usedIds = new Set<string>();
  const orderedCards: T[] = [];

  for (const id of orderedIds) {
    const card = cardById.get(id);
    if (!card || usedIds.has(id)) continue;
    usedIds.add(id);
    orderedCards.push(card);
  }

  for (const card of cards) {
    const id = getId(card);
    if (usedIds.has(id)) continue;
    usedIds.add(id);
    orderedCards.push(card);
  }

  return orderedCards;
}

export type HomepageRecommendationCandidate = {
  id: string;
  destinationCode: string;
};

export function buildHomepageRecommendationOrder(
  surfaces: Readonly<Record<string, readonly HomepageRecommendationCandidate[]>>,
  destinationCodes: readonly string[],
): Record<string, string[]> {
  if (!destinationCodes.length) return {};

  return Object.fromEntries(
    Object.entries(surfaces).map(([surface, cards]) => [
      surface,
      reorderHomepageCardsBySavedItemDestinations(
        cards,
        destinationCodes,
        (card) => card.destinationCode,
      ).map((card) => card.id),
    ]),
  );
}
