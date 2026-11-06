import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getRequestIp, requireAdminApiSession, writeAdminAuditLog } from "@/lib/admin";
import { CMS_IMAGE_MAX_BYTES, validateCmsImageFile } from "@/lib/cmsImageUploadRules";
import { getCmsImageStorageConfig, storeCmsImage } from "@/services/cmsImageStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readLimitedBody(request: Request): Promise<Uint8Array | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      if (part.value) {
        total += part.value.byteLength;
        if (total > CMS_IMAGE_MAX_BYTES) {
          await reader.cancel().catch(() => {});
          return null;
        }
        chunks.push(part.value);
      }
    }
  } finally {
    reader.releaseLock();
  }
  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const part of chunks) {
    buffer.set(part, offset);
    offset += part.byteLength;
  }
  return buffer;
}

export async function POST(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  // Reject cross-origin browser requests, including cookie-authenticated CSRF.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Image uploads must come from this website." }, { status: 403 });
  }

  if (!getCmsImageStorageConfig()) {
    return NextResponse.json({
      error: "Image uploads are not configured. Ask an administrator to configure CMS image storage.",
      code: "CMS_IMAGE_STORAGE_UNAVAILABLE",
    }, { status: 503 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > CMS_IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 413 });
  }

  let bytes: Uint8Array | null;
  try {
    bytes = await readLimitedBody(request);
  } catch {
    return NextResponse.json({ error: "Could not read the image. Try uploading it again." }, { status: 400 });
  }
  if (!bytes) return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 413 });

  const checked = validateCmsImageFile(bytes, request.headers.get("content-type") || "");
  if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 });

  const filename = `${randomUUID()}.${checked.format.extension}`;
  try {
    const stored = await storeCmsImage(filename, bytes);
    if (!stored) return NextResponse.json({ error: "Image storage rejected the upload. Please try again." }, { status: 503 });

    const logged = await writeAdminAuditLog({
      adminUserId: auth.session.user.id,
      adminEmail: auth.session.user.email || "",
      action: "CMS_IMAGE_UPLOADED",
      targetType: "CmsImage",
      targetId: filename,
      metadata: { filename, bytes: bytes.byteLength, mime: checked.format.mime },
      request,
    });
    if (!logged) return NextResponse.json({ error: "Image uploaded but its audit record could not be saved. Contact an administrator." }, { status: 503 });
    return NextResponse.json({ url: `/api/cms/images/${filename}` }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Image storage is currently unavailable. Please try again." }, { status: 503 });
  }
}
