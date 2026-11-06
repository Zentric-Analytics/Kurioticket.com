import { createHash, createHmac } from "node:crypto";

import { cmsImageContentType, cmsImageObjectKey } from "@/lib/cmsImageUploadRules";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

export function getCmsImageStorageConfig(): R2Config | null {
  const accountId = process.env.CMS_R2_ACCOUNT_ID?.trim() || "";
  const accessKeyId = process.env.CMS_R2_ACCESS_KEY_ID?.trim() || "";
  const secretAccessKey = process.env.CMS_R2_SECRET_ACCESS_KEY?.trim() || "";
  const bucket = process.env.CMS_R2_BUCKET?.trim() || "";
  // The host is always generated from a fixed trusted Cloudflare domain.
  if (!/^[a-f0-9]{32}$/i.test(accountId) || !/^[A-Za-z0-9]{8,128}$/.test(accessKeyId) ||
      !secretAccessKey || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

const sha256 = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
const sign = (key: Uint8Array | string, value: string) => createHmac("sha256", key).update(value).digest();

function r2Signature(config: R2Config, method: "PUT" | "GET", objectKey: string, body: Uint8Array) {
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const pathname = `/${encodeURIComponent(config.bucket)}/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
  const now = new Date();
  const dateTime = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = dateTime.slice(0, 8);
  const payloadHash = sha256(body);
  const headerBlock = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${dateTime}\n`;
  const headerNames = "host;x-amz-content-sha256;x-amz-date";
  const requestHash = sha256(`${method}\n${pathname}\n\n${headerBlock}\n${headerNames}\n${payloadHash}`);
  const scope = `${date}/auto/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${dateTime}\n${scope}\n${requestHash}`;
  const dateKey = sign(`AWS4${config.secretAccessKey}`, date);
  const regionKey = sign(dateKey, "auto");
  const serviceKey = sign(regionKey, "s3");
  const signingKey = sign(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return {
    url: `https://${host}${pathname}`,
    headers: {
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": dateTime,
      Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope},SignedHeaders=${headerNames},Signature=${signature}`,
    },
  };
}

export async function storeCmsImage(filename: string, bytes: Uint8Array): Promise<boolean> {
  const config = getCmsImageStorageConfig();
  const objectKey = cmsImageObjectKey(filename);
  const mime = cmsImageContentType(filename);
  if (!config || !objectKey || !mime) return false;
  const req = r2Signature(config, "PUT", objectKey, bytes);
  const response = await fetch(req.url, {
    method: "PUT",
    headers: {
      ...req.headers,
      "content-type": mime,
      "cache-control": "public, max-age=31536000, immutable",
    },
    body: new Blob([Uint8Array.from(bytes)], { type: mime }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  return response.ok;
}

export async function loadCmsImage(filename: string): Promise<Response | null> {
  const config = getCmsImageStorageConfig();
  const objectKey = cmsImageObjectKey(filename);
  if (!config || !objectKey) return null;
  const req = r2Signature(config, "GET", objectKey, new Uint8Array());
  return fetch(req.url, {
    method: "GET",
    headers: req.headers,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
}
