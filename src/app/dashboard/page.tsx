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

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 py-8">
        {!session?.user ? (
          <Card className="p-6">
            <h1 className="text-2xl font-bold text-navy">Your travel dashboard</h1>
            <p className="mt-2 text-muted">Log in to save flights, hotels, searches, alerts, and preferences.</p>
            <LinkButton href="/auth/signin" className="mt-4">Log in</LinkButton>
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold text-teal-dark">Free Dashboard</p>
                <h1 className="mt-1 text-3xl font-bold text-navy">Welcome back{session.user.name ? `, ${session.user.name}` : ""}</h1>
              </div>
              <LinkButton href="/dashboard/premium" variant="secondary">Premium Dashboard</LinkButton>
            </div>
            <div className="mt-6">
              <FreeDashboardGrid />
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
