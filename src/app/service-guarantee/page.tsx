import { HelpCircle } from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { LinkButton } from "@/components/ui/Button";

export const metadata = {
  title: "Service Guarantee",
};

const serviceFaqs = [
  {
    question: "What does Kurioticket guarantee?",
    answer:
      "Kurioticket is designed to help travelers compare travel options clearly. We aim to provide a reliable platform experience, transparent search information, and clear paths to provider booking pages.",
  },
  {
    question: "How are travel results displayed?",
    answer:
      "Results are displayed using information available from travel providers, including routes, dates, prices, and provider details when available.",
  },
  {
    question: "Why am I redirected to another provider?",
    answer:
      "Some results are completed on an external provider site. When you choose one of those options, Kurioticket redirects you so the provider can handle booking, payment, and trip-specific service.",
  },
  {
    question: "Do I book directly on Kurioticket?",
    answer:
      "Kurioticket is primarily a travel search and comparison platform. If a result redirects to a provider, the booking is completed with that provider rather than on Kurioticket.",
  },
  {
    question: "Are prices always guaranteed?",
    answer:
      "No. Prices can change based on provider availability, taxes, fees, currency, and timing. Always review the final price on the provider page before booking.",
  },
  {
    question: "How does Kurioticket choose providers?",
    answer:
      "Kurioticket works with travel providers and data sources that can supply relevant search results. Availability, pricing, and displayed options may vary by route, destination, and provider coverage.",
  },
  {
    question: "What should I do if I encounter an issue?",
    answer:
      "If the issue is related to search, account access, saved trips, alerts, or a redirect from Kurioticket, contact Kurioticket support. If you already booked with a provider, contact that provider for booking changes, refunds, cancellations, or travel documents.",
  },
  {
    question: "How can I contact support?",
    answer:
      "Use the Customer Support page and include your account email, what you were trying to do, and any route, hotel, or provider details that may help us review the issue.",
  },
];

export default function ServiceGuaranteePage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-8 pb-10 sm:pt-10 lg:pt-12">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold text-teal-dark">Kurioticket service commitment</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-navy">Service Guarantee</h1>
          <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
            We want travelers to understand how Kurioticket works and what they can expect when using our platform.
          </p>
        </section>

        <section aria-labelledby="service-faq-heading" className="mt-10 max-w-3xl">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-teal/10 p-2 text-teal">
              <HelpCircle size={22} />
            </div>
            <div>
              <h2 id="service-faq-heading" className="text-2xl font-bold tracking-tight text-navy">
                Frequently asked questions
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
                These answers explain Kurioticket&apos;s role as a travel search and comparison platform.
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
          <h2 className="text-xl font-bold text-navy">Need help with your account or search?</h2>
          <LinkButton href="/support" variant="accent" size="lg" className="mt-5 w-full sm:w-auto">
            Contact Customer Support
          </LinkButton>
        </section>
      </main>
      <Footer />
    </>
  );
}
