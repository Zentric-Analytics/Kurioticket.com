import { Bell, Bookmark, CreditCard, Headphones, Hotel, Plane, Route, Search, Settings, Sparkles, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

const freeItems = [
  { title: "Saved Flights", icon: Plane, body: "Keep promising fares ready for review." },
  { title: "Saved Hotels", icon: Hotel, body: "Compare stays around your trip needs." },
  { title: "Saved Searches", icon: Search, body: "Return to common routes quickly." },
  { title: "Recent Searches", icon: Route, body: "Track what you compared recently." },
  { title: "Price Alerts", icon: Bell, body: "Free users can keep 3 active alerts." },
  { title: "Recommended Deals", icon: TrendingDown, body: "Curated routes and low-stress values." },
  { title: "Travel Watchlist", icon: Bookmark, body: "Monitor routes, hotels, and ideas." },
  { title: "Account Settings", icon: Settings, body: "Preferences, notifications, and deletion." },
];

const premiumItems = [
  "AI Travel Concierge",
  "Smart Route Optimizer",
  "Advanced Price Tracking",
  "Travel Risk Insights",
  "Smart Trip Planner",
  "Savings Reports",
  "Premium Notifications",
  "Priority Support",
  "Subscription & Billing",
];

export function FreeDashboardGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {freeItems.map((item) => (
        <Card key={item.title} className="p-4">
          <item.icon size={22} className="text-teal" />
          <h2 className="mt-3 font-bold text-navy">{item.title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted">{item.body}</p>
        </Card>
      ))}
    </div>
  );
}

export function PremiumDashboardFoundation() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <Sparkles className="text-teal" size={24} />
          <div>
            <h2 className="text-xl font-bold text-navy">Premium Home</h2>
            <p className="text-sm text-muted">Travel optimization tools are ready for Phase 1 and built for deeper intelligence later.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {premiumItems.map((item) => (
            <div key={item} className="rounded-md border border-border bg-surface-muted p-3 text-sm font-semibold text-navy">
              {item}
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <CreditCard className="text-teal" size={24} />
        <h2 className="mt-3 text-xl font-bold text-navy">Subscription & Billing</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Stripe checkout, subscriptions, billing portal, invoices, and webhook sync are wired for production credentials.
        </p>
        <LinkButton href="/pricing" variant="accent" className="mt-4 w-full">
          Manage Premium
        </LinkButton>
      </Card>
      <Card className="p-5 lg:col-span-2">
        <Headphones className="text-teal" size={24} />
        <h2 className="mt-3 text-xl font-bold text-navy">Priority Support Foundation</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Support is scoped to Curioticket platform usage, premium tools, alerts, and travel guidance. Airlines and booking partners handle final booking issues.
        </p>
      </Card>
    </div>
  );
}
