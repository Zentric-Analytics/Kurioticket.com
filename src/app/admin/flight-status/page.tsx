import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth-guards";

export const metadata = { title: "Admin Trip Monitoring" };

/** Preserve flight-status bookmarks while consolidating monitoring into Trips. */
export default async function AdminFlightStatusRedirect() {
  await requireAdminSession("/admin/flight-status");
  redirect("/admin/confirmed-trips/monitoring?panel=flight#flight-status-overview-title");
}
