import assert from "node:assert/strict";
import test from "node:test";
import { isSameOriginRequest } from "./visitor-identity";

import {
  CMS_IMAGE_MAX_BYTES,
  cmsImageContentType,
  cmsImageObjectKey,
  detectCmsImageFormat,
  validateCmsImageFile,
} from "./cmsImageUploadRules";

const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0x00, 0x01]);
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const webp = Uint8Array.from([82, 73, 70, 70, 12, 0, 0, 0, 87, 69, 66, 80]);

test("CMS image sniffing accepts JPEG, PNG and WebP, not arbitrary binary or SVG", () => {
  assert.equal(detectCmsImageFormat(jpeg)?.mime, "image/jpeg");
  assert.equal(detectCmsImageFormat(png)?.mime, "image/png");
  assert.equal(detectCmsImageFormat(webp)?.mime, "image/webp");
  assert.equal(detectCmsImageFormat(new TextEncoder().encode("<svg/>")), null);
  assert.equal(detectCmsImageFormat(new Uint8Array()), null);
});

test("upload limits and MIME mismatch are rejected on the server", () => {
  assert.deepEqual(validateCmsImageFile(jpeg, "image/jpeg"), { format: { extension: "jpg", mime: "image/jpeg" } });
  assert.ok("error" in validateCmsImageFile(jpeg, "image/png"));
  assert.ok("error" in validateCmsImageFile(new Uint8Array(), "image/png"));
  assert.ok("error" in validateCmsImageFile(new Uint8Array(CMS_IMAGE_MAX_BYTES + 1), "image/png"));
});

test("only randomized flat image filenames can be read from CMS object storage", () => {
  const filename = "2b3af71a-4ba7-4dc5-9fbe-204c94a8b302.webp";
  assert.equal(cmsImageObjectKey(filename), "cms/images/" + filename);
  assert.equal(cmsImageContentType(filename), "image/webp");
  for (const path of ["../../secret.png", "a.webp", "anything.svg", filename + "?foo=1", "cms/images/" + filename]) {
    assert.equal(cmsImageObjectKey(path), null, path);
    assert.equal(cmsImageContentType(path), null, path);
  }
});

test("CMS upload origin guard recognizes configured staging behind Render and rejects cross-site requests", () => {
  const oldPublic = process.env.NEXT_PUBLIC_APP_URL;
  const oldNextAuth = process.env.NEXTAUTH_URL;
  try {
    process.env.NEXT_PUBLIC_APP_URL = "https://staging.kurioticket.com";
    delete process.env.NEXTAUTH_URL;
    const make = (origin: string, site: string) =>
      new Request("http://localhost:10000/api/admin/content/image-upload", {
        method: "POST",
        headers: { origin, "sec-fetch-site": site },
      });
    assert.equal(isSameOriginRequest(make("https://staging.kurioticket.com", "same-origin")), true);
    assert.equal(isSameOriginRequest(make("https://kurioticket.com", "same-site")), false);
    assert.equal(isSameOriginRequest(make("https://attacker.example", "cross-site")), false);
    assert.equal(isSameOriginRequest(make("https://staging.kurioticket.com", "cross-site")), false);
  } finally {
    if (oldPublic === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = oldPublic;
    if (oldNextAuth === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = oldNextAuth;
  }
});
