import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth-guards";

/** Old guest-session links use the same Admin Users activity screen. */
export default async function LegacyGuestSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminSession("/admin/searches/sessions/" + encodeURIComponent(id));
  redirect("/admin/users/guest/" + encodeURIComponent(id) + "/activity");
}
