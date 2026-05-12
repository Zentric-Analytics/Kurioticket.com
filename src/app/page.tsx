import type { ReactNode } from "react";
import { BaggageClaim, CalendarCheck, CheckCircle2, Headphones, Plane, SearchCheck, ShieldCheck, TicketCheck } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SearchTabs } from "@/components/search/SearchTabs";
import { Badge } from "@/components/ui/Badge";
import { Card, Panel } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

const tools = [
  { label: "Manage Booking", icon: TicketCheck },
  { label: "Flight Status", icon: Plane },
  { label: "Check-in", icon: CalendarCheck },
  { label: "Baggage Info", icon: BaggageClaim },
  { label: "Support", icon: Headphones },
];

const deals = [
  { route: "Houston to Tokyo", price: "$711", note: "Round-trip partner fares" },
  { route: "New York to London", price: "$394", note: "Flexible winter dates" },
  { route: "Los Angeles to Mexico City", price: "$218", note: "Short-haul value routes" },
];

export default function Home() {
  return (
    <>
      <AppHeader />
      <main className="flex-1">
        <section className="bg-[linear-gradient(180deg,#071526_0%,#10233c_58%,#f7fafc_58%)]">
          <div className="page-shell grid gap-8 pb-10 pt-10 md:pt-14">
            <div className="max-w-3xl text-white">
              <Badge variant="teal" className="bg-white/10 text-teal-100">No service fees</Badge>
              <h1 className="mt-5 text-4xl font-bold leading-tight md:text-6xl">Find Cheap Flights Fast</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-200">
                Compare affordable flights and hotels in seconds.
              </p>
            </div>
            <SearchTabs />
          </div>
        </section>

        <Panel>
          <div className="page-shell py-8">
            <h2 className="text-xl font-bold text-navy">Quick travel tools</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {tools.map((tool) => (
                <Card key={tool.label} className="p-4">
                  <tool.icon className="text-teal" size={22} />
                  <div className="mt-3 text-sm font-bold text-navy">{tool.label}</div>
                </Card>
              ))}
            </div>
          </div>
        </Panel>

        <section className="page-shell py-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-dark">Best Deals</p>
              <h2 className="mt-1 text-2xl font-bold text-navy">Affordable routes worth checking</h2>
            </div>
            <LinkButton href="/deals" variant="secondary">View Deals</LinkButton>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {deals.map((deal) => (
              <Card key={deal.route} className="p-5">
                <div className="text-sm font-semibold text-muted">{deal.route}</div>
                <div className="mt-2 text-3xl font-bold text-navy">{deal.price}</div>
                <p className="mt-2 text-sm text-muted">{deal.note}</p>
              </Card>
            ))}
          </div>
        </section>

        <Panel>
          <div className="page-shell grid gap-5 py-10 md:grid-cols-3">
            <TrustItem icon={<SearchCheck size={22} />} title="Compare clearly" body="Search across provider APIs and normalize results into one readable format." />
            <TrustItem icon={<ShieldCheck size={22} />} title="Book transparently" body="Continue to airlines or trusted partners for final booking and payment." />
            <TrustItem icon={<CheckCircle2 size={22} />} title="Stay in control" body="Save options, set alerts, and track decisions from your dashboard." />
          </div>
        </Panel>
      </main>
      <Footer />
    </>
  );
}

function TrustItem({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-teal/10 text-teal">{icon}</div>
      <div>
        <h3 className="font-bold text-navy">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
      </div>
    </div>
  );
}
