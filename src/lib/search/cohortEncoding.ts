import { createHash } from "node:crypto";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";

const compress = promisify(gzip);
const decompress = promisify(gunzip);
export const COHORT_CHUNK_BYTES = 64 * 1024;
const MAX_RAW_BYTES = 128 * 1024 * 1024;
export type CohortManifest = {
  format: "gzip-chunks-v1";
  generation: string;
  chunks: number;
  rawBytes: number;
  sha256: string;
};

export async function encodeCohort(results: unknown[], generation: string) {
  const raw = Buffer.from(JSON.stringify(results));
  if (raw.length > MAX_RAW_BYTES) throw new Error("Cohort exceeds safe cache size");
  const compressed = await compress(raw);
  const chunks: string[] = [];
  for (let offset = 0; offset < compressed.length; offset += COHORT_CHUNK_BYTES) {
    chunks.push(compressed.subarray(offset, offset + COHORT_CHUNK_BYTES).toString("base64"));
  }
  const manifest: CohortManifest = { format: "gzip-chunks-v1", generation, chunks: chunks.length,
    rawBytes: raw.length, sha256: createHash("sha256").update(raw).digest("hex") };
  return { manifest, chunks };
}

export function isCohortManifest(value: unknown): value is CohortManifest {
  if (!value || typeof value !== "object") return false;
  const m = value as CohortManifest;
  return m.format === "gzip-chunks-v1" && /^[a-f0-9-]{36}$/.test(m.generation)
    && Number.isInteger(m.chunks) && m.chunks > 0 && m.chunks <= 4096
    && Number.isInteger(m.rawBytes) && m.rawBytes > 0 && m.rawBytes <= MAX_RAW_BYTES
    && /^[a-f0-9]{64}$/.test(m.sha256);
}

export async function decodeCohort(manifest: CohortManifest, chunks: unknown[]) {
  if (!isCohortManifest(manifest) || chunks.length !== manifest.chunks) throw new Error("Incomplete cohort");
  const buffers = chunks.map(chunk => {
    if (typeof chunk !== "string" || chunk.length > Math.ceil(COHORT_CHUNK_BYTES / 3) * 4
      || !/^[A-Za-z0-9+/]*={0,2}$/.test(chunk)) throw new Error("Invalid cohort chunk");
    return Buffer.from(chunk, "base64");
  });
  const raw = await decompress(Buffer.concat(buffers), { maxOutputLength: manifest.rawBytes });
  if (raw.length !== manifest.rawBytes || createHash("sha256").update(raw).digest("hex") !== manifest.sha256) {
    throw new Error("Cohort integrity mismatch");
  }
  const results: unknown = JSON.parse(raw.toString("utf8"));
  if (!Array.isArray(results)) throw new Error("Invalid cohort results");
  return results;
}
