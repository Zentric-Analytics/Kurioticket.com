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
      "Curioticket brings available flight, hotel, route, and travel result information into a single search experience so travelers can review options more efficiently.",
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
      "Use account tools to organize saved searches, trips, alerts, and preferences in one Curioticket workspace.",
    details:
      "These tools support travel planning on Curioticket, while provider-specific booking management remains with the provider when your booking is completed externally.",
  },
];

const serviceFaqs = [
  {
    question: "What is Curioticket?",
    answer:
      "Curioticket is a travel search and comparison platform for finding, comparing, saving, and organizing travel options from multiple providers.",
  },
  {
    question: "How does travel search work?",
    answer:
      "You enter trip details, and Curioticket displays available travel options and provider information that may help you compare choices.",
  },
  {
    question: "Why am I redirected to another provider?",
    answer:
      "Some offers are completed on external provider sites. The provider handles final booking steps, payment, confirmation, and fulfillment.",
  },
  {
    question: "Does Curioticket process payments?",
    answer:
      "For redirected provider offers, Curioticket does not process payment. Review and complete payment directly on the provider page.",
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
              Learn how Curioticket helps travelers search, compare, save, and organize travel options from multiple providers in one place.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
            <div className="rounded-2xl bg-surface-muted p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal text-white">
                  <Search size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy">Plan with context</p>
                  <p className="text-xs text-muted">Search, compare, save, redirect</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {serviceSections.slice(0, 4).map((item) => (
                  <div key={item.title} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm shadow-sm">
                    <span className="font-semibold text-navy">{item.title}</span>
                    <span className="text-xs font-bold text-teal-dark">{item.number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="how-curioticket-works" className="mt-10">
          <div className="max-w-3xl">
            <h2 id="how-curioticket-works" className="text-2xl font-bold tracking-tight text-navy">
              How Curioticket works
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
              These service details explain Curioticket&apos;s role before, during, and after a travel search.
            </p>
          </div>

          <div className="mt-6 grid gap-5">
            {serviceSections.map((item, index) => {
              const Icon = item.icon;
              const reverse = index % 2 === 1;

              return (
                <article
                  key={item.title}
                  className="grid overflow-hidden rounded-3xl border border-border bg-white shadow-sm lg:grid-cols-[0.88fr_1.12fr]"
                >
                  <div className={`bg-surface-muted p-5 sm:p-6 ${reverse ? "lg:order-2" : ""}`}>
                    <div className="flex h-full min-h-40 flex-col justify-between rounded-2xl border border-white/80 bg-white/70 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-bold text-teal-dark">{item.number}</span>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal/10 text-teal">
                          <Icon size={24} />
                        </div>
                      </div>
                      <div className="mt-8 h-2 rounded-full bg-white">
                        <div className="h-2 w-2/3 rounded-full bg-teal" />
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 lg:p-8">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-teal-dark">Service step</p>
                    <h3 className="mt-2 text-2xl font-bold text-navy">{item.title}</h3>
                    <p className="mt-3 text-sm font-semibold leading-6 text-navy sm:text-base">{item.summary}</p>
                    <p className="mt-3 text-sm leading-6 text-muted sm:text-base">{item.details}</p>
                  </div>
                </article>
              );
            })}
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
