import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth-guards";

export const metadata = { title: "Admin Confirmation Alerts" };

/** Preserve existing bookmarks without opening a duplicate alerts workspace. */
export default async function AdminConfirmedTripAlertsPage() {
  await requireAdminSession("/admin/confirmed-trips/alerts");
  redirect("/admin/confirmed-trips#confirmation-delivery-health-title");
}
