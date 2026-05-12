import type { ReactNode } from "react";
import { HelpCircle, LifeBuoy, MessageSquare, ShieldAlert } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SupportForm } from "@/components/support/SupportForm";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Support",
};

export default function SupportPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 py-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-teal-dark">Intelligent Travel Assistance</p>
          <h1 className="mt-1 text-3xl font-bold text-navy">Support Center</h1>
          <p className="mt-3 text-muted">
            Curioticket helps with platform usage, premium tools, price alerts, optimization, and travel guidance. Airlines and partners handle ticket changes, refunds, cancellations, check-in, boarding, and final booking issues.
          </p>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_420px]">
          <section className="grid gap-4 sm:grid-cols-2">
            <SupportCard icon={<HelpCircle size={22} />} title="Smart Help Center" body="Search, alerts, partner redirects, account settings, and premium tool guidance." />
            <SupportCard icon={<MessageSquare size={22} />} title="AI Travel Assistance" body="Premium support can draft context-aware travel guidance from verified platform data." />
            <SupportCard icon={<LifeBuoy size={22} />} title="Human + AI Hybrid" body="Tickets keep context so the support team can respond without asking you to repeat everything." />
            <SupportCard icon={<ShieldAlert size={22} />} title="Clear Boundaries" body="We help with Curioticket. Providers handle final bookings and payment disputes." />
          </section>
          <SupportForm />
        </div>
      </main>
      <Footer />
    </>
  );
}

function SupportCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <Card className="p-5">
      <div className="text-teal">{icon}</div>
      <h2 className="mt-3 font-bold text-navy">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </Card>
  );
}
