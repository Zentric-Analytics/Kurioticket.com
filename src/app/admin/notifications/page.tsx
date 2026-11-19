import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth-guards";
import { isProtectedAdminEmail } from "@/lib/admin";

// Preserve bookmarked links and alert source URLs, but keep one authoritative
// operational alert workspace under Settings > Notifications.
export default async function LegacyAdminNotificationsPage() {
  const session = await requireAdminSession("/admin/notifications");
  if (!isProtectedAdminEmail(session.user.email)) redirect("/dashboard");
  redirect("/admin/settings/notifications");
}
