import Link from "next/link";
import {
  Bell,
  Bookmark,
  CheckCircle2,
  Headphones,
  Heart,
  LifeBuoy,
  LockKeyhole,
  Mail,
  Route,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type DashboardCard = {
  title: string;
  body: string;
  eyebrow?: string;
  href?: string;
  icon: LucideIcon;
  cta?: string;
};

const navItems = [
  { label: "Overview", href: "#overview" },
  { label: "Trips", href: "#travel-activity" },
  { label: "Saved", href: "#saved-watchlist" },
  { label: "Price alerts", href: "/dashboard/alerts" },
  { label: "Preferences", href: "#account-tools" },
  { label: "Support", href: "#support" },
];

const overviewCards: DashboardCard[] = [
  {
    title: "Trips",
    eyebrow: "No trips yet",
    body: "Start by searching flights, hotels, or cars. Trip details can be organized here when available.",
    href: "#travel-activity",
    icon: Route,
    cta: "Review trip tools",
  },
  {
    title: "Saved items",
    eyebrow: "Ready when you save something",
    body: "Use saved trips to keep routes, stays, and ideas easy to revisit.",
    href: "/saved",
    icon: Heart,
    cta: "Open saved trips",
  },
  {
    title: "Price alerts",
    eyebrow: "No price alerts yet",
    body: "Create alerts from search results when alert tools are available.",
    href: "/dashboard/alerts",
    icon: Bell,
    cta: "View alert settings",
  },
  {
    title: "Recent searches",
    eyebrow: "No recent searches shown",
    body: "Return to flights, hotels, or cars to start a fresh comparison.",
    href: "#travel-activity",
    icon: Search,
    cta: "Start searching",
  },
];

const savedCards: DashboardCard[] = [
  {
    title: "Saved trips",
    body: "Keep routes, stays, and trip ideas ready to revisit.",
    href: "/saved",
    icon: Bookmark,
    cta: "View saved trips",
  },
  {
    title: "Saved searches",
    body: "Return to searches you want to compare again when saved-search tools are available.",
    icon: Search,
    eyebrow: "Coming soon",
  },
  {
    title: "Watchlist",
    body: "Group planning ideas without claiming bookings, prices, or alerts exist.",
    icon: CheckCircle2,
    eyebrow: "Coming soon",
  },
];

const accountToolCards: DashboardCard[] = [
  {
    title: "Personal details",
    body: "Review account basics from settings when profile controls are available.",
    href: "/dashboard/settings",
    icon: UserRound,
    cta: "Open settings",
  },
  {
    title: "Notification preferences",
    body: "Manage email and alert preferences from the account settings area.",
    href: "/dashboard/settings",
    icon: Mail,
    cta: "Manage preferences",
  },
  {
    title: "Travel preferences",
    body: "Preference controls will help tailor planning tools when available.",
    icon: Settings,
    eyebrow: "Coming soon",
  },
  {
    title: "Security and privacy",
    body: "Find privacy controls and account safety information from trusted Kurioticket pages.",
    href: "/legal",
    icon: ShieldCheck,
    cta: "Review policies",
  },
];

const supportCards: DashboardCard[] = [
  {
    title: "Help center",
    body: "Browse Kurioticket guidance, account information, and travel-planning help.",
    icon: LifeBuoy,
    eyebrow: "Coming soon",
  },
  {
    title: "Contact support",
    body: "Support options will appear here as account servicing tools are added.",
    icon: Headphones,
    eyebrow: "Coming soon",
  },
  {
    title: "Privacy and data",
    body: "Review legal and privacy information for data, account, and platform policies.",
    href: "/legal",
    icon: LockKeyhole,
    cta: "Open legal center",
  },
];


function ActionCard({ card, compact = false }: { card: DashboardCard; compact?: boolean }) {
  const Icon = card.icon;
  const content = (
    <Card
      className={cn(
        "h-full p-5 transition",
        card.href
          ? "hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-[0_22px_55px_-34px_rgba(13,148,136,0.7)]"
          : "bg-white/80 shadow-none",
        compact ? "p-4" : "p-5",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal/10 text-teal-dark">
          <Icon size={22} aria-hidden="true" />
        </span>
        {card.eyebrow ? (
          <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted">{card.eyebrow}</span>
        ) : null}
      </div>
      <h3 className="mt-4 text-lg font-bold text-navy">{card.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{card.body}</p>
      {card.cta ? <p className="mt-4 text-sm font-semibold text-teal-dark">{card.cta}</p> : null}
    </Card>
  );

  if (!card.href) {
    return content;
  }

  return (
    <Link href={card.href} className="focus-ring block h-full rounded-2xl">
      {content}
    </Link>
  );
}

function SectionHeader({ id, eyebrow, title, body }: { id: string; eyebrow: string; title: string; body: string }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-2xl font-bold tracking-tight text-navy">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}

export function FreeDashboardGrid() {
  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-28 lg:self-start" aria-label="Account navigation">
        <nav className="overflow-x-auto rounded-2xl border border-border bg-white p-2 shadow-[0_18px_44px_-34px_rgba(30,27,75,0.45)] lg:overflow-visible">
          <div className="flex min-w-max gap-2 lg:min-w-0 lg:flex-col">
            {navItems.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "focus-ring rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-surface-muted",
                  index === 0 ? "bg-navy text-white hover:bg-navy-soft" : "text-navy",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </aside>

      <div className="space-y-8">
        <section id="overview" aria-labelledby="overview-title" className="scroll-mt-28">
          <div>
            <SectionHeader
              id="overview-title"
              eyebrow="Overview"
              title="Your account at a glance"
              body="A clear starting point for trips, saved ideas, alerts, and recent planning activity. Empty states stay honest until account data is connected."
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((card) => (
              <ActionCard key={card.title} card={card} />
            ))}
          </div>
        </section>

        <section id="travel-activity" aria-labelledby="travel-activity-title" className="scroll-mt-28">
          <Card className="overflow-hidden p-0">
            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">Trips</p>
                <h2 id="travel-activity-title" className="mt-2 text-2xl font-bold tracking-tight text-navy">Your travel activity</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                  Trips you save or book through provider flows can be organized here.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:w-44 lg:grid-cols-1">
                <LinkButton href="/flights/results" className="w-full">Search flights</LinkButton>
                <LinkButton href="/hotels" variant="secondary" className="w-full">Search hotels</LinkButton>
                <LinkButton href="/cars" variant="secondary" className="w-full">Search cars</LinkButton>
              </div>
            </div>
            <div className="border-t border-border bg-surface-muted/70 px-5 py-4 text-sm leading-6 text-muted sm:px-6">
              No trips yet. Start with a search, then use saved items and provider flows to keep planning organized.
            </div>
          </Card>
        </section>

        <section id="saved-watchlist" aria-labelledby="saved-watchlist-title" className="scroll-mt-28">
          <div>
            <SectionHeader
              id="saved-watchlist-title"
              eyebrow="Saved and watchlist"
              title="Keep planning ideas easy to revisit"
              body="Saved trips are linked when available. Saved-search and watchlist tools use clear upcoming states until they are connected to real account data."
            />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {savedCards.map((card) => (
              <ActionCard key={card.title} card={card} compact />
            ))}
          </div>
        </section>

        <section id="account-tools" aria-labelledby="account-tools-title" className="scroll-mt-28">
          <div>
            <SectionHeader
              id="account-tools-title"
              eyebrow="Account tools"
              title="Manage your Kurioticket account"
              body="Use existing account and policy pages where they are available. Upcoming tools are labeled clearly instead of appearing functional before they are ready."
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {accountToolCards.map((card) => (
              <ActionCard key={card.title} card={card} compact />
            ))}
          </div>
        </section>

        <section id="support" aria-labelledby="support-title" className="scroll-mt-28">
          <div>
            <SectionHeader
              id="support-title"
              eyebrow="Help and support"
              title="Support for account and platform questions"
              body="Find guidance for Kurioticket account usage while providers continue to service purchases and travel rules from their own flows."
            />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {supportCards.map((card) => (
              <ActionCard key={card.title} card={card} compact />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
