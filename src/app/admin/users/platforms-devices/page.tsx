import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth-guards";

// Keep existing bookmarked URLs working without rendering another copy of the
// monitoring dashboard inside Users. Preserve supported filters and pagination.
export default async function LegacyPlatformsDevicesRedirect({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession("/admin/users/platforms-devices");
  const raw = await searchParams;
  const query = new URLSearchParams();
  for (const key of ["range", "platform", "page"] as const) {
    const value = raw[key];
    if (Array.isArray(value)) value.forEach(item => query.append(key, item));
    else if (typeof value === "string") query.set(key, value);
  }
  const suffix = query.toString();
  redirect("/admin/platforms/devices" + (suffix ? "?" + suffix : ""));
}
