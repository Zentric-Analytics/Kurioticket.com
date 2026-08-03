import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin";
import { isStagingEnvironment } from "@/lib/stagingSafety";

export async function requirePreviewTesterAdmin() {
  if (!isStagingEnvironment()) {
    return { response: NextResponse.json({ error: "Not found." }, { status: 404 }) };
  }
  return requireAdminApiSession();
}
