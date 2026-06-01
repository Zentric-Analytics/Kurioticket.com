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

const getImageIdentity = (imageUrl: string) => {
  const parsed = new URL(imageUrl);
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

    const parsed = new URL(item.image);
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
