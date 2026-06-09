import { ExternalLink, GitCompare, MousePointerClick, Search } from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "How Kurioticket Works",
};

const steps = [
  {
    number: "01",
    title: "Search travel options",
    icon: Search,
    description:
      "Enter your trip details to look for available flights, hotels, cars, or travel deals.",
  },
  {
    number: "02",
    title: "Compare available results",
    icon: GitCompare,
    description:
      "Review available options, prices, schedules, provider details, and other travel information when shown.",
  },
  {
    number: "03",
    title: "Choose an offer",
    icon: MousePointerClick,
    description:
      "Select the option that best matches your plans after reviewing the available details.",
  },
  {
    number: "04",
    title: "Continue with the provider",
    icon: ExternalLink,
    description:
      "When redirected, continue on the provider website to review final details and complete any booking steps.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-8 pb-10 sm:pt-10 lg:pt-12">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold text-teal-dark">How Kurioticket works</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">How Kurioticket Works</h1>
          <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
            Kurioticket helps travelers move from search to comparison, then on to the provider
            when an offer is selected.
          </p>
        </section>

        <section aria-labelledby="how-it-works-steps" className="mt-10 max-w-3xl">
          <h2 id="how-it-works-steps" className="text-xl font-bold tracking-tight text-navy sm:text-2xl">
            Basic flow
          </h2>

          <div className="mt-5 grid gap-4">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <article
                  key={step.title}
                  className="grid gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm sm:grid-cols-[auto_1fr] sm:p-5"
                >
                  <div className="flex items-center gap-3 sm:block">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal/10 text-teal ring-1 ring-teal/15">
                      <Icon size={21} />
                    </div>
                    <span className="inline-flex rounded-full bg-surface-muted px-2.5 py-1 text-xs font-bold text-teal-dark sm:mt-3">
                      {step.number}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-navy sm:text-lg">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted sm:text-base">{step.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-10 max-w-3xl rounded-2xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-xl font-bold text-navy">Provider websites</h2>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
            Some bookings may be completed on provider websites after Kurioticket redirects you.
            Review the provider page for final availability, pricing, terms, payment steps, and
            booking details before completing a purchase.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
