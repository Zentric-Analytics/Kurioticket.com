import { getServerSession } from "next-auth";
import { Activity, CreditCard, DollarSign, Flag, Gauge, LifeBuoy, Plane, Scale, Users } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { ProviderHealthPanel } from "@/components/admin/ProviderHealthPanel";
import { Card } from "@/components/ui/Card";
import { authOptions } from "@/lib/auth";

const modules = [
  { title: "Users", icon: Users, body: "Account status, roles, premium access, and onboarding." },
  { title: "Subscriptions", icon: CreditCard, body: "Stripe status, trials, cancellations, invoices, and billing portal events." },
  { title: "Searches", icon: Plane, body: "Route popularity, abandoned searches, latency, and result quality." },
  { title: "Redirects", icon: Activity, body: "Partner redirect logs by provider, route, price, and source page." },
  { title: "Alerts", icon: Gauge, body: "Alert status, next checks, and premium monitoring load." },
  { title: "Support Tickets", icon: LifeBuoy, body: "Human and AI hybrid support queue with priority support." },
  { title: "Provider Health", icon: Activity, body: "API failures, latency, provider toggles, and emergency shutdowns." },
  { title: "Feature Flags", icon: Flag, body: "AI features, premium experiments, pricing tests, providers, onboarding, and layouts." },
  { title: "Cost Monitoring", icon: DollarSign, body: "Travel API usage, OpenAI limits, cache hit rates, and provider cost trends." },
  { title: "Legal Documents", icon: Scale, body: "Published legal drafts, updates, and content controls." },
];

export const metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 py-8">
        <div>
          <p className="text-sm font-semibold text-teal-dark">Admin foundation</p>
          <h1 className="mt-1 text-3xl font-bold text-navy">Operations Dashboard</h1>
          {!isAdmin ? (
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Admin access is role-gated through authentication and ADMIN_EMAILS. This page shows the Phase 1 operations modules for setup review.
            </p>
          ) : null}
        </div>
        <div className="mt-6">
          <ProviderHealthPanel enabled={isAdmin} />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Card key={module.title} className="p-4">
              <module.icon className="text-teal" size={22} />
              <h2 className="mt-3 font-bold text-navy">{module.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted">{module.body}</p>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
