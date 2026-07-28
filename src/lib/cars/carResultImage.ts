const CARS_RESULTS_IMAGE_VERSION = "4x3-20260723";

export const resolveCarResultImageSource = (imageUrl?: string) =>
  imageUrl?.startsWith("/images/cars/results/")
    ? `${imageUrl}?v=${CARS_RESULTS_IMAGE_VERSION}`
    : imageUrl;
