import { CheckCircle2 } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { PremiumCheckout } from "@/components/pricing/PremiumCheckout";
import { Card } from "@/components/ui/Card";

const features = [
  "AI Travel Concierge",
  "Smart Route Optimizer",
  "Unlimited price alerts",
  "Advanced price tracking",
  "Personalized recommendations",
  "Travel risk insights",
  "Destination intelligence",
  "Savings reports",
  "Priority support",
];

export const metadata = {
  title: "Premium",
};

export default function PricingPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-24 pb-10 sm:pt-28 lg:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold text-teal-dark">Travel smarter, save more money, reduce stress</p>
          <h1 className="mt-2 text-4xl font-bold text-navy">Curioticket Premium</h1>
          <p className="mt-3 text-muted">
            Premium is an intelligent travel optimization membership. It is never required for basic flight or hotel search.
          </p>
        </div>
        <div className="mx-auto mt-8 grid max-w-4xl gap-5 md:grid-cols-2">
          <PlanCard title="Monthly" price="$9.99" cadence="per month" interval="month" />
          <PlanCard title="Annual" price="$79" cadence="per year" interval="year" highlight />
        </div>
        <Card className="mx-auto mt-6 max-w-4xl p-5">
          <h2 className="text-xl font-bold text-navy">Premium unlocks</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm font-semibold text-muted">
                <CheckCircle2 size={17} className="text-teal" />
                {feature}
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-muted">
            Subscriptions are processed by Stripe. Review the Subscription Terms before checkout.
          </p>
        </Card>
      </main>
      <Footer />
    </>
  );
}

function PlanCard({
  title,
  price,
  cadence,
  interval,
  highlight = false,
}: {
  title: string;
  price: string;
  cadence: string;
  interval: "month" | "year";
  highlight?: boolean;
}) {
  return (
    <Card className={`p-5 ${highlight ? "border-teal shadow-md" : ""}`}>
      <h2 className="text-xl font-bold text-navy">{title}</h2>
      <div className="mt-4 flex items-end gap-2">
        <span className="text-4xl font-bold text-navy">{price}</span>
        <span className="pb-1 text-sm text-muted">{cadence}</span>
      </div>
      <p className="mt-2 text-sm text-muted">7-day free trial. Cancel through the Stripe billing portal.</p>
      <div className="mt-5">
        <PremiumCheckout interval={interval} />
      </div>
    </Card>
  );
}
