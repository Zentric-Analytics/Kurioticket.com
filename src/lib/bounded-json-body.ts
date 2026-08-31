export const MAX_PASSKEY_ASSERTION_BODY_BYTES = 32 * 1024;

export type BoundedJsonBodyErrorCode =
  | "BODY_TOO_LARGE"
  | "INVALID_CONTENT_LENGTH"
  | "BODY_LENGTH_MISMATCH"
  | "INVALID_BODY"
  | "INVALID_JSON";

export class BoundedJsonBodyError extends Error {
  constructor(public readonly code: BoundedJsonBodyErrorCode) {
    super(code);
    this.name = "BoundedJsonBodyError";
  }
}

type BodyRequest = Pick<Request, "headers" | "body">;

function declaredLength(headers: Headers, maxBytes: number): number | null {
  const raw = headers.get("content-length");
  if (raw === null) return null;
  const value = raw.trim();
  if (!/^\d+$/.test(value)) throw new BoundedJsonBodyError("INVALID_CONTENT_LENGTH");
  const length = Number(value);
  if (!Number.isSafeInteger(length)) throw new BoundedJsonBodyError("INVALID_CONTENT_LENGTH");
  if (length > maxBytes) throw new BoundedJsonBodyError("BODY_TOO_LARGE");
  return length;
}

async function cancelBody(body: ReadableStream<Uint8Array> | null) {
  if (!body || body.locked) return;
  await body.cancel("request body rejected").catch(() => {});
}

export async function readBoundedJsonBody(
  request: BodyRequest,
  maxBytes = MAX_PASSKEY_ASSERTION_BODY_BYTES,
): Promise<unknown> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new RangeError("maxBytes must be a positive safe integer");

  let expected: number | null;
  try {
    expected = declaredLength(request.headers, maxBytes);
  } catch (error) {
    await cancelBody(request.body);
    throw error;
  }

  if (!request.body) throw new BoundedJsonBodyError("INVALID_BODY");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      const chunk = result.value;
      total += chunk.byteLength;
      if (total > maxBytes) {
        await reader.cancel("request body exceeds limit").catch(() => {});
        throw new BoundedJsonBodyError("BODY_TOO_LARGE");
      }
      chunks.push(chunk);
    }
  } catch (error) {
    if (error instanceof BoundedJsonBodyError) throw error;
    throw new BoundedJsonBodyError("INVALID_BODY");
  } finally {
    reader.releaseLock();
  }

  if (expected !== null && expected !== total) throw new BoundedJsonBodyError("BODY_LENGTH_MISMATCH");

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new BoundedJsonBodyError("INVALID_BODY");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BoundedJsonBodyError("INVALID_JSON");
  }
}
