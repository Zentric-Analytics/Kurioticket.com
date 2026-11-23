export type DestinationImageValidationItem = {
  id: string;
  image: string;
};

const blockedImageHosts = new Set([
  "picsum.photos",
  "fastly.picsum.photos",
  "placehold.co",
  "placekitten.com",
]);

const blockedImageUrlFragments = [
  "placeholder",
  "source.unsplash.com",
  "/random",
  "?random",
  "&random",
];

const approvedLocalImage = /^\/images\/staging-remediation\/(?:phoenix|honolulu|puerto-vallarta|dallas|dubai|lisbon|mombasa|accra|madrid|istanbul|bangkok|san-jose)\.webp$/;
const parseImage = (image: string) => new URL(image, (approvedLocalImage.test(image) || image === "/images/premium/homepage/destinations/kurioticket-homepage-destination-paris-eiffel-tower-buildings-001.jpg") ? "https://kurioticket.com" : undefined);
const getImageIdentity = (imageUrl: string) => {
  const parsed = parseImage(imageUrl);
  return `${parsed.hostname}${parsed.pathname}`;
};

export function validateDestinationImages(
  catalogName: string,
  items: DestinationImageValidationItem[],
) {
  const urls = new Map<string, string>();
  const identities = new Map<string, string>();

  for (const item of items) {
    if (!item.image) {
      throw new Error(`${catalogName}: ${item.id} is missing an image URL.`);
    }

    const parsed = parseImage(item.image);
    const lowerUrl = item.image.toLowerCase();

    if (parsed.protocol !== "https:") {
      throw new Error(`${catalogName}: ${item.id} must use an HTTPS image URL.`);
    }

    if (blockedImageHosts.has(parsed.hostname)) {
      throw new Error(`${catalogName}: ${item.id} uses placeholder host ${parsed.hostname}.`);
    }

    if (blockedImageUrlFragments.some((fragment) => lowerUrl.includes(fragment))) {
      throw new Error(`${catalogName}: ${item.id} uses a placeholder or generated image URL.`);
    }

    const previousUrlOwner = urls.get(item.image);
    if (previousUrlOwner) {
      throw new Error(
        `${catalogName}: ${item.id} reuses the exact image URL from ${previousUrlOwner}.`,
      );
    }
    urls.set(item.image, item.id);

    const identity = getImageIdentity(item.image);
    const previousIdentityOwner = identities.get(identity);
    if (previousIdentityOwner) {
      throw new Error(
        `${catalogName}: ${item.id} reuses the same source image as ${previousIdentityOwner}.`,
      );
    }
    identities.set(identity, item.id);
  }
}
