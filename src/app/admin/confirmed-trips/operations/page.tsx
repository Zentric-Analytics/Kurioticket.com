import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth-guards";

export const metadata = { title: "Admin Trip Monitoring" };

type Props = { searchParams?: Promise<{ panel?: string | string[] }> };

/** Keep existing Trip operations bookmarks and delivery-alert deep links functional. */
export default async function AdminTripOperationsRedirect({ searchParams }: Props) {
  await requireAdminSession("/admin/confirmed-trips/operations");
  const panel = (await searchParams)?.panel;
  if (panel === "delivery") {
    redirect("/admin/confirmed-trips/monitoring?panel=delivery#confirmation-delivery-health-title");
  }
  redirect("/admin/confirmed-trips/monitoring?panel=confirmations#trip-confirmations-panel");
}
