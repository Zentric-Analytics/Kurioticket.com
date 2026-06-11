import {
  imageProducts,
  imageSources,
  imageStatuses,
  imageUsages,
  type ImageProduct,
  type ImageSource,
  type ImageStatus,
  type ImageUsage,
  type RegisteredImage,
} from "./imageTypes";

type ValidationIssue = {
  id?: string;
  url?: string;
  message: string;
};

export type ImageRegistryValidationResult = {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  duplicateUrls: Map<string, RegisteredImage[]>;
  duplicateSourceIdentities: Map<string, RegisteredImage[]>;
  launchCriticalGovernanceIssues: RegisteredImage[];
};

const placeholderHosts = new Set(["picsum.photos", "placehold.co", "placekitten.com"]);
const localPublicPathPattern = /^\/([\w.-]+\/)*[\w.-]+\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
const meaningfulAltWordPattern = /[a-z]{3,}/i;
const weakAltTexts = new Set(["image", "photo", "picture", "placeholder", "travel", "hotel", "destination"]);

export function validateImageRegistry(images: RegisteredImage[]): ImageRegistryValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const duplicateUrls = groupByDuplicate(images, (image) => image.url);
  const duplicateSourceIdentities = groupByDuplicate(images, (image) => safeGetSourceIdentity(image.url));
  const launchCriticalGovernanceIssues: RegisteredImage[] = [];

  for (const image of images) {
    if (!image.id.trim()) errors.push(issue(image, "Image id is required."));
    if (!image.url.trim()) errors.push(issue(image, "Image URL is required."));
    if (!isValidProduct(image.product)) errors.push(issue(image, `Invalid product: ${image.product}.`));
    if (!isValidSource(image.source)) errors.push(issue(image, `Invalid source: ${image.source}.`));
    if (!isValidStatus(image.status)) errors.push(issue(image, `Invalid status: ${image.status}.`));

    const usages = Array.isArray(image.usage) ? image.usage : [image.usage];
    for (const usage of usages) {
      if (!isValidUsage(usage)) errors.push(issue(image, `Invalid usage: ${usage}.`));
    }

    if (!isApprovedUrl(image.url)) {
      errors.push(issue(image, "Image URL must be HTTPS or an approved local public path."));
    }

    const forbiddenReason = getForbiddenUrlReason(image.url);
    if (forbiddenReason) errors.push(issue(image, forbiddenReason));

    if (!isMeaningfulAlt(image.alt)) {
      errors.push(issue(image, "Alt text is required and must be meaningful."));
    }

    if (
      image.launchCritical &&
      ["temporary", "replace-before-launch", "blocked"].includes(image.status)
    ) {
      launchCriticalGovernanceIssues.push(image);
      errors.push(issue(image, "Launch-critical images cannot be temporary, replace-before-launch, or blocked."));
    }

    if (
      image.status === "premium-approved" &&
      !image.sourcePage &&
      !image.license &&
      !image.licenseNotes
    ) {
      warnings.push(issue(image, "Premium-approved images should include sourcePage, license, or licenseNotes."));
    }

    if (image.status === "provider-real") {
      if (!image.sourcePage && !image.licenseNotes && !["provider", "hotelbeds"].includes(image.source)) {
        warnings.push(issue(image, "Provider-real images should identify their provider/source."));
      }
      if (["premium-stock", "pexels", "unsplash", "temporary"].includes(image.source)) {
        errors.push(issue(image, "Provider-real images must not be treated as marketing stock."));
      }
    }

    if (
      image.status === "free-approved" &&
      (!image.sourcePage || (!image.license && !image.licenseNotes))
    ) {
      warnings.push(issue(image, "Free-approved images should include sourcePage and license/source notes."));
    }
  }

  for (const [url, matches] of duplicateUrls) {
    errors.push({ url, message: `Duplicate exact registry URL appears in ${matches.length} entries.` });
  }

  for (const [identity, matches] of duplicateSourceIdentities) {
    errors.push({ url: identity, message: `Duplicate registry source identity appears in ${matches.length} entries.` });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    duplicateUrls,
    duplicateSourceIdentities,
    launchCriticalGovernanceIssues,
  };
}

export function getSourceIdentity(value: string): string {
  if (localPublicPathPattern.test(value)) return value;

  const url = new URL(value);
  return `${url.hostname}${url.pathname}`;
}

export function isApprovedUrl(value: string): boolean {
  if (localPublicPathPattern.test(value)) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function getForbiddenUrlReason(value: string): string | undefined {
  const normalized = value.toLowerCase();
  const url = parseExternalUrl(value);

  if (url && placeholderHosts.has(url.hostname)) {
    return `Placeholder image host is blocked: ${url.hostname}.`;
  }

  if (url?.hostname === "source.unsplash.com") {
    return "source.unsplash.com is blocked because it can return random/unstable assets.";
  }

  if (normalized.includes("/random") || normalized.includes("?random") || normalized.includes("&random")) {
    return "Random image URLs are blocked.";
  }

  return undefined;
}

function safeGetSourceIdentity(value: string): string {
  try {
    return getSourceIdentity(value);
  } catch {
    return `invalid:${value}`;
  }
}

function parseExternalUrl(value: string): URL | undefined {
  if (localPublicPathPattern.test(value)) return undefined;

  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function isValidProduct(value: string): value is ImageProduct {
  return (imageProducts as readonly string[]).includes(value);
}

function isValidUsage(value: string): value is ImageUsage {
  return (imageUsages as readonly string[]).includes(value);
}

function isValidSource(value: string): value is ImageSource {
  return (imageSources as readonly string[]).includes(value);
}

function isValidStatus(value: string): value is ImageStatus {
  return (imageStatuses as readonly string[]).includes(value);
}

function isMeaningfulAlt(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.length >= 12 && meaningfulAltWordPattern.test(normalized) && !weakAltTexts.has(normalized);
}

function groupByDuplicate(images: RegisteredImage[], keyForImage: (image: RegisteredImage) => string) {
  const grouped = new Map<string, RegisteredImage[]>();

  for (const image of images) {
    const key = keyForImage(image);
    const matches = grouped.get(key) ?? [];
    matches.push(image);
    grouped.set(key, matches);
  }

  for (const [key, matches] of grouped) {
    if (matches.length < 2) grouped.delete(key);
  }

  return grouped;
}

function issue(image: RegisteredImage, message: string): ValidationIssue {
  return { id: image.id, url: image.url, message };
}
