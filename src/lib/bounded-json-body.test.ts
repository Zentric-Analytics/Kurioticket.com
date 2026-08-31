import assert from "node:assert/strict";
import test from "node:test";
import { BoundedJsonBodyError, readBoundedJsonBody } from "./bounded-json-body";

const encoder = new TextEncoder();

function requestFromParts(parts: string[], contentLength?: string) {
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < parts.length) controller.enqueue(encoder.encode(parts[index++]));
      else controller.close();
    },
  });
  const headers = new Headers();
  if (contentLength !== undefined) headers.set("content-length", contentLength);
  return { headers, body } as Pick<Request, "headers" | "body">;
}

async function rejectsWithCode(promise: Promise<unknown>, code: BoundedJsonBodyError["code"]) {
  await assert.rejects(promise, (error: unknown) => error instanceof BoundedJsonBodyError && error.code === code);
}

test("accepts valid JSON at the exact byte boundary", async () => {
  const body = '{"a":1}';
  assert.equal(encoder.encode(body).byteLength, 7);
  assert.deepEqual(await readBoundedJsonBody(requestFromParts(["{\"a\":" , "1}"], "7"), 7), { a: 1 });
});

test("counts streamed bytes and cancels an oversized body without Content-Length", async () => {
  let sent = false;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (!sent) {
        sent = true;
        controller.enqueue(encoder.encode("123456789"));
      }
    },
    cancel() { cancelled = true; },
  });
  const request = { headers: new Headers(), body } as Pick<Request, "headers" | "body">;
  await rejectsWithCode(readBoundedJsonBody(request, 8), "BODY_TOO_LARGE");
  assert.equal(cancelled, true);
});

test("rejects invalid, oversized, and misleading Content-Length values", async () => {
  await rejectsWithCode(readBoundedJsonBody(requestFromParts(["{}"], "not-a-number"), 8), "INVALID_CONTENT_LENGTH");
  await rejectsWithCode(readBoundedJsonBody(requestFromParts(["{}"], "9"), 8), "BODY_TOO_LARGE");
  await rejectsWithCode(readBoundedJsonBody(requestFromParts(["{\"a\":1}"], "2"), 8), "BODY_LENGTH_MISMATCH");
});

test("rejects malformed JSON only after the bounded read completes", async () => {
  await rejectsWithCode(readBoundedJsonBody(requestFromParts(["{broken"], "7"), 8), "INVALID_JSON");
});
