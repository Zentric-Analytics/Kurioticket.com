const CARS_RESULTS_IMAGE_VERSION = "transparent-cutouts-20260912";
const CURATED_CAR_RESULT_IMAGE_PREFIX = "/images/cars/results/";

const carResultImagePathname = (imageUrl?: string) => {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith(CURATED_CAR_RESULT_IMAGE_PREFIX)) {
    return imageUrl.split(/[?#]/, 1)[0];
  }

  try {
    return new URL(imageUrl).pathname;
  } catch {
    return undefined;
  }
};

export const isCuratedCarResultImage = (imageUrl?: string) =>
  carResultImagePathname(imageUrl)?.startsWith(CURATED_CAR_RESULT_IMAGE_PREFIX) ?? false;

export const resolveCarResultImageSource = (imageUrl?: string) =>
  isCuratedCarResultImage(imageUrl)
    ? `${imageUrl}${imageUrl?.includes("?") ? "&" : "?"}v=${CARS_RESULTS_IMAGE_VERSION}`
    : imageUrl;
