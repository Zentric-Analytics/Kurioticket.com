import {
  CURATED_HOTEL_FALLBACK_IMAGES,
  normalizeHotelImageUrls,
} from "@/services/travel/hotelImages";

const curatedFallbackUrls = new Set(
  CURATED_HOTEL_FALLBACK_IMAGES.map((image) => image.url),
);

function removeCuratedFallbackUrls(candidates: string[]) {
  return candidates.filter((url) => !curatedFallbackUrls.has(url));
}

export function buildHotelGalleryCandidates(
  imageUrls: unknown,
  imageUrl: unknown,
): string[] {
  const candidates = removeCuratedFallbackUrls(
    normalizeHotelImageUrls(imageUrls),
  );
  const seen = new Set(candidates);

  const normalizedPrimary = removeCuratedFallbackUrls(
    normalizeHotelImageUrls([imageUrl]),
  );
  for (const url of normalizedPrimary) {
    if (seen.has(url)) continue;
    seen.add(url);
    candidates.push(url);
  }

  return candidates;
}

function normalizeGalleryIndex(index: number, length: number) {
  if (length <= 0) return -1;
  if (!Number.isFinite(index)) return 0;

  const integerIndex = Math.trunc(index);
  return ((integerIndex % length) + length) % length;
}

export function resolveHotelGalleryIndex(
  candidates: readonly string[],
  failedUrls: ReadonlySet<string>,
  preferredIndex: number,
): number {
  if (candidates.length === 0) return -1;

  const startIndex = normalizeGalleryIndex(preferredIndex, candidates.length);

  for (let offset = 0; offset < candidates.length; offset += 1) {
    const candidateIndex = (startIndex + offset) % candidates.length;
    const candidate = candidates[candidateIndex];
    if (candidate && !failedUrls.has(candidate)) return candidateIndex;
  }

  return -1;
}

export function getAdjacentHotelGalleryIndex(
  candidates: readonly string[],
  failedUrls: ReadonlySet<string>,
  currentIndex: number,
  direction: -1 | 1,
): number {
  if (candidates.length === 0) return -1;

  const usableCount = candidates.reduce(
    (count, candidate) =>
      count + (candidate && !failedUrls.has(candidate) ? 1 : 0),
    0,
  );
  if (usableCount === 0) return -1;

  const normalizedCurrentIndex = normalizeGalleryIndex(
    currentIndex,
    candidates.length,
  );

  for (let offset = 1; offset <= candidates.length; offset += 1) {
    const candidateIndex =
      (normalizedCurrentIndex + direction * offset + candidates.length) %
      candidates.length;
    const candidate = candidates[candidateIndex];
    if (candidate && !failedUrls.has(candidate)) return candidateIndex;
  }

  return -1;
}
