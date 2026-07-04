import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PendingDeletionContent } from "@/components/account/PendingDeletionContent";
import { authOptions } from "@/lib/auth";
import { getCurrentDeletionRequest } from "@/services/accountDeletionService";

export const metadata = { title: "Account deletion pending" };

export default async function PendingDeletionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=%2Faccount%2Fpending-deletion");
  const request = await getCurrentDeletionRequest(session.user.id);
  if (!request || session.user.status !== "PENDING_DELETION") redirect("/dashboard");
  if (request.deletionScheduledAt <= new Date()) redirect("/auth/signin?error=AccountUnavailable");

  return <PendingDeletionContent deadline={request.deletionScheduledAt.toISOString()} />;
}
