import { notFound, redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth-guards";
import { safeLiveGuestReference } from "@/lib/guestFirstAccessObservation";
export const dynamic = "force-dynamic";

/** Old links remain safe; the new route independently rechecks Admin and presence. */
export default async function LegacyLiveGuestActivity({params}: {params:Promise<{reference:string}>}) {
  await requireAdminSession("/admin/users/online");
  const {reference}=await params;
  if (!safeLiveGuestReference(reference)) notFound();
  redirect("/admin/users/live-guest/" + encodeURIComponent(reference) + "/activity");
}
