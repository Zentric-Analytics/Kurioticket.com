import { Bell, ExternalLink, GitCompare, HelpCircle, Search, UserRound } from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { LinkButton } from "@/components/ui/Button";

export const metadata = {
  title: "More Service Information",
};

const serviceSections = [
  {
    number: "01",
    title: "Search Multiple Providers",
    icon: Search,
    summary:
      "Search travel options across different providers from one place instead of opening each provider separately.",
    details:
      "Kurioticket brings available flight, hotel, route, and travel result information into a single search experience so travelers can review options more efficiently.",
  },
  {
    number: "02",
    title: "Compare Travel Options",
    icon: GitCompare,
    summary:
      "Compare prices, routes, hotels, schedules, and available travel options before deciding what fits your trip.",
    details:
      "Results may include provider details, timing, destination information, and other trip data that help you evaluate the option before continuing to the provider.",
  },
  {
    number: "03",
    title: "Save Trips and Alerts",
    icon: Bell,
    summary:
      "Create an account to save trips, track routes, and manage travel alerts connected to your travel planning.",
    details:
      "Saved trips, recent searches, and alerts make it easier to return to options you are considering and keep related travel planning details organized.",
  },
  {
    number: "04",
    title: "Provider Redirects Explained",
    icon: ExternalLink,
    summary:
      "When you select an offer, you may be redirected to a travel provider to complete booking, payment, confirmation, and fulfillment.",
    details:
      "The provider page is where final prices, availability, rules, payment steps, receipts, booking changes, cancellations, and travel documents are handled for redirected offers.",
  },
  {
    number: "05",
    title: "Account & Travel Tools",
    icon: UserRound,
    summary:
      "Use account tools to organize saved searches, trips, alerts, and preferences in one Kurioticket workspace.",
    details:
      "These tools support travel planning on Kurioticket, while provider-specific booking management remains with the provider when your booking is completed externally.",
  },
];

const serviceFaqs = [
  {
    question: "What is Kurioticket?",
    answer:
      "Kurioticket is a travel search and comparison platform for finding, comparing, saving, and organizing travel options from multiple providers.",
  },
  {
    question: "How does travel search work?",
    answer:
      "You enter trip details, and Kurioticket displays available travel options and provider information that may help you compare choices.",
  },
  {
    question: "Why am I redirected to another provider?",
    answer:
      "Some offers are completed on external provider sites. The provider handles final booking steps, payment, confirmation, and fulfillment.",
  },
  {
    question: "Does Kurioticket process payments?",
    answer:
      "For redirected provider offers, Kurioticket does not process payment. Review and complete payment directly on the provider page.",
  },
  {
    question: "Can I save trips and alerts?",
    answer:
      "Yes. Account tools can help you save trips, track routes, manage alerts, and return to travel options you are considering.",
  },
  {
    question: "Is an account required?",
    answer:
      "You can browse search information without every account tool, but saving trips, alerts, and preferences may require signing in.",
  },
  {
    question: "How do I contact support?",
    answer:
      "Use the Customer Support page and include your account email, what you were trying to do, and any route, hotel, or provider details.",
  },
];

export default function MoreServiceInfoPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-8 pb-10 sm:pt-10 lg:pt-12">
        <section className="grid items-center gap-8 lg:grid-cols-[1fr_0.72fr]">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-teal-dark">Platform Information</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-navy sm:text-5xl">
              More Service Information
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
              Learn how Kurioticket helps travelers search, compare, save, and organize travel options from multiple providers in one place.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
            <div className="rounded-2xl bg-gradient-to-br from-surface-muted to-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal text-white shadow-sm">
                  <Search size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy">Plan with context</p>
                  <p className="text-xs text-muted">From search results to provider redirects</p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 text-sm text-navy">
                <div className="rounded-xl border border-white bg-white/80 px-4 py-3 shadow-sm">
                  Compare options from multiple travel providers.
                </div>
                <div className="rounded-xl border border-white bg-white/80 px-4 py-3 shadow-sm">
                  Save trips, alerts, and preferences when signed in.
                </div>
                <div className="rounded-xl border border-white bg-white/80 px-4 py-3 shadow-sm">
                  Continue with provider details before booking externally.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="how-kurioticket-works" className="mx-auto mt-10 max-w-5xl">
          <div className="rounded-3xl border border-border bg-white/80 p-5 shadow-sm sm:p-6 lg:p-7">
            <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <h2 id="how-kurioticket-works" className="text-2xl font-bold tracking-tight text-navy">
                  How Kurioticket works
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
                  These service details explain Kurioticket&apos;s role before, during, and after a travel search.
                </p>
              </div>
              <p className="rounded-full bg-teal/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-dark">
                Travel planning basics
              </p>
            </div>

            <div className="mt-6 grid gap-4">
              {serviceSections.map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.title}
                    className="grid gap-4 rounded-2xl border border-border/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal/30 hover:shadow-md sm:grid-cols-[auto_1fr] sm:p-5"
                  >
                    <div className="flex items-center gap-3 sm:block">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal/10 text-teal ring-1 ring-teal/15">
                        <Icon size={21} />
                      </div>
                      <span className="inline-flex rounded-full bg-surface-muted px-2.5 py-1 text-xs font-bold text-teal-dark sm:mt-3">
                        {item.number}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-lg font-bold text-navy sm:text-xl">{item.title}</h3>
                        <span className="hidden h-px flex-1 bg-border sm:block" />
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-6 text-navy sm:text-[15px]">{item.summary}</p>
                      <p className="mt-2 text-sm leading-6 text-muted sm:text-[15px]">{item.details}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section aria-labelledby="more-service-faq-heading" className="mt-10 max-w-3xl">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-teal/10 p-2 text-teal">
              <HelpCircle size={22} />
            </div>
            <div>
              <h2 id="more-service-faq-heading" className="text-2xl font-bold tracking-tight text-navy">
                Frequently asked questions
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
                Short answers about travel search, provider redirects, saved trips, and account tools.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-x-8 gap-y-1">
            {serviceFaqs.map((item) => (
              <details key={item.question} className="group border-b border-border py-4">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-semibold leading-6 text-navy marker:hidden sm:text-base">
                  <span>{item.question}</span>
                  <span
                    aria-hidden="true"
                    className="mt-0.5 text-base leading-none text-muted transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-6 text-muted sm:text-base">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-10 max-w-3xl rounded-2xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-xl font-bold text-navy">Need help?</h2>
          <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
            Questions about your account, saved trips, alerts, or provider redirects?
          </p>
          <LinkButton href="/support" variant="accent" size="lg" className="mt-5 w-full sm:w-auto">
            Contact Customer Support
          </LinkButton>
        </section>
      </main>
      <Footer />
    </>
  );
}
