import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { PendingDeletionActions } from "@/components/account/PendingDeletionActions";
import { authOptions } from "@/lib/auth";
import { getCurrentDeletionRequest } from "@/services/accountDeletionService";

export const metadata = { title: "Account deletion pending" };

export default async function PendingDeletionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=%2Faccount%2Fpending-deletion");
  const request = await getCurrentDeletionRequest(session.user.id);
  if (!request || session.user.status !== "PENDING_DELETION") redirect("/dashboard");
  if (request.deletionScheduledAt <= new Date()) redirect("/auth/signin?error=AccountUnavailable");
  const deadline = new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short" }).format(request.deletionScheduledAt);

  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-[#f3f7fc] px-4 py-12">
        <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-teal">Welcome back</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Your account deletion is pending.</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">Your account is scheduled for permanent deletion on <strong className="text-slate-950">{deadline}</strong>.</p>
          <p className="mt-3 text-base leading-7 text-slate-600">You can reactivate your account before this date. Until then, normal dashboard browsing is restricted.</p>
          <PendingDeletionActions deadline={request.deletionScheduledAt.toISOString()} />
        </section>
      </main>
      <Footer />
    </>
  );
}
