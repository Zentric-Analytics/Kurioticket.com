import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth-guards";

export const metadata = { title: "Admin Search Activity" };

/** Preserve old Flight Operations bookmarks while Search Activity owns flight-search monitoring. */
export default async function AdminFlightsRedirect() {
  await requireAdminSession("/admin/flights");
  redirect("/admin/searches/activity?product=FLIGHT");
}
