import { getServerSession } from "next-auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FreeDashboardGrid } from "@/components/dashboard/DashboardGrid";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Dashboard",
};

function getInitials(name?: string | null, email?: string | null) {
  const label = name?.trim() || email?.split("@")[0] || "Kurioticket traveler";
  const parts = label.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return label.slice(0, 2).toUpperCase();
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userName = session?.user?.name?.trim();
  const userEmail = session?.user?.email?.trim();
  const displayName = userName || "traveler";
  const initials = getInitials(userName, userEmail);

  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.12),transparent_34%),linear-gradient(180deg,#f8fbfc_0%,#ffffff_48%,#f8fafc_100%)] pb-10 pt-24 sm:pt-28 lg:pt-28">
        <div className="page-shell">
          {!session?.user ? (
            <Card className="mx-auto max-w-3xl overflow-hidden p-0">
              <div className="border-b border-border bg-surface-muted/70 px-6 py-5 sm:px-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-dark">My account</p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl">Plan smarter with your travel dashboard</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
                  Log in to organize saved trip ideas, return to planning tools, manage alerts when available, and keep account settings in one clear place.
                </p>
              </div>
              <div className="grid gap-5 px-6 py-6 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="grid gap-3 text-sm leading-6 text-muted sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-white p-4">
                    <span className="font-semibold text-navy">Save ideas</span>
                    <p className="mt-1">Keep routes, stays, and planning links ready to revisit.</p>
                  </div>
                  <div className="rounded-xl border border-border bg-white p-4">
                    <span className="font-semibold text-navy">Manage tools</span>
                    <p className="mt-1">Find saved items, alert settings, and preferences faster.</p>
                  </div>
                  <div className="rounded-xl border border-border bg-white p-4">
                    <span className="font-semibold text-navy">Stay organized</span>
                    <p className="mt-1">Use a clean account home before and after provider flows.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <LinkButton href="/auth/signin" className="w-full sm:w-auto lg:w-full">Log in</LinkButton>
                  <LinkButton href="/auth/signup" variant="secondary" className="w-full sm:w-auto lg:w-full">Create account</LinkButton>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <section className="overflow-hidden rounded-[2rem] border border-border bg-white shadow-[0_24px_70px_-42px_rgba(30,27,75,0.5)]" aria-labelledby="dashboard-title">
                <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-navy text-xl font-bold text-white shadow-[0_18px_35px_-24px_rgba(30,27,75,0.7)]" aria-hidden="true">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-dark">Kurioticket account</p>
                      <h1 id="dashboard-title" className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
                        Welcome back, {displayName}
                      </h1>
                      {userEmail ? <p className="mt-2 text-sm font-medium text-muted">{userEmail}</p> : null}
                      <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
                        Your dashboard keeps trip planning actions, saved ideas, alerts, and account tools organized without showing made-up activity.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:w-48 lg:grid-cols-1">
                    <LinkButton href="/flights/results" className="w-full">Search flights</LinkButton>
                    <LinkButton href="/hotels" variant="secondary" className="w-full">Search hotels</LinkButton>
                    <LinkButton href="/saved" variant="secondary" className="w-full">View saved trips</LinkButton>
                  </div>
                </div>
              </section>

              <div className="mt-6">
                <FreeDashboardGrid />
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
