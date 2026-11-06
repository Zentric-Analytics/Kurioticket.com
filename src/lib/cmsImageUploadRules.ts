/** Rules shared by the CMS upload button and its authenticated API. */
export const CMS_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CMS_IMAGE_MAX_REQUEST_BYTES = CMS_IMAGE_MAX_BYTES + 512 * 1024;

export type CmsImageFormat = {
  extension: "jpg" | "png" | "webp";
  mime: "image/jpeg" | "image/png" | "image/webp";
};

export function detectCmsImageFormat(bytes: Uint8Array): CmsImageFormat | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: "jpg", mime: "image/jpeg" };
  }
  if (bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => bytes[i] === byte)) {
    return { extension: "png", mime: "image/png" };
  }
  if (bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP") {
    return { extension: "webp", mime: "image/webp" };
  }
  return null;
}

export function validateCmsImageFile(
  bytes: Uint8Array,
  declaredMime: string,
): { format: CmsImageFormat } | { error: string } {
  if (bytes.byteLength === 0) return { error: "Choose a non-empty image." };
  if (bytes.byteLength > CMS_IMAGE_MAX_BYTES) return { error: "Image must be 5 MB or smaller." };

  const format = detectCmsImageFormat(bytes);
  if (!format) return { error: "Choose a JPEG, PNG or WebP image." };
  if (declaredMime && declaredMime.toLowerCase() !== format.mime) {
    return { error: "The file type does not match its image contents." };
  }
  return { format };
}

const cmsImageNamePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/;

export function cmsImageObjectKey(filename: string): string | null {
  if (!cmsImageNamePattern.test(filename)) return null;
  return `cms/images/${filename}`;
}

export function cmsImageContentType(filename: string): CmsImageFormat["mime"] | null {
  if (!cmsImageObjectKey(filename)) return null;
  if (filename.endsWith(".jpg")) return "image/jpeg";
  if (filename.endsWith(".png")) return "image/png";
  return "image/webp";
}
