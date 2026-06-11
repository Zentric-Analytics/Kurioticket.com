import Link from "next/link";
import { AlertTriangle, FileText } from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Terms of Service",
};

const termsSections = [
  {
    title: "Using Kurioticket",
    body: "Kurioticket is a travel search and comparison service that helps travelers review flights, hotels, cars, and travel deals. You are responsible for using the service lawfully and for keeping your account information accurate and secure.",
  },
  {
    title: "Travel results and external providers",
    body: "Search results may include prices, schedules, availability, rules, and links from external providers. Details can change quickly, and the provider page is the final place to review price, availability, fees, rules, and purchase terms before you book.",
  },
  {
    title: "Bookings and support",
    body: "Unless Kurioticket clearly states that a purchase is completed directly through Kurioticket, booking, payment, ticketing, changes, cancellations, refunds, receipts, check-in, and travel documents are handled by the external provider.",
  },
  {
    title: "Accounts and platform integrity",
    body: "Do not misuse accounts, searches, alerts, support tools, redirects, or integrations. Kurioticket may limit access when needed to protect users, service reliability, security, or platform operations.",
  },
];

export default function TermsPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-8 pb-10 sm:pt-10 lg:pt-12">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold text-teal-dark">
            Kurioticket legal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            Terms of service
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
            These lightweight terms explain the basic expectations for using
            Kurioticket while the platform prepares for launch. They are
            intended as readable launch-preparation copy, not final legal
            advice.
          </p>
        </section>

        <section className="mt-8 max-w-3xl rounded-2xl border border-amber/30 bg-amber/10 p-5 text-sm leading-6 text-amber sm:p-6 sm:text-base">
          <div className="flex gap-3">
            <AlertTriangle
              className="mt-0.5 shrink-0"
              size={20}
              aria-hidden="true"
            />
            <p>
              Final legal terms should be reviewed by qualified legal counsel
              before public launch or before relying on this page as the
              official terms for Kurioticket.
            </p>
          </div>
        </section>

        <section className="mt-8 grid max-w-4xl gap-4">
          {termsSections.map((section) => (
            <article
              key={section.title}
              className="rounded-2xl border border-border bg-white p-5 shadow-[0_16px_40px_-28px_rgba(30,27,75,0.45)] sm:p-6"
            >
              <div className="flex gap-3">
                <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal-dark">
                  <FileText size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-navy">
                    {section.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
                    {section.body}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 max-w-3xl text-sm leading-6 text-muted sm:text-base">
          <p>
            For a fuller draft, visit the{" "}
            <Link
              href="/legal/terms-of-service"
              className="font-bold text-teal-dark underline-offset-4 hover:underline"
            >
              legal center terms
            </Link>
            .
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
