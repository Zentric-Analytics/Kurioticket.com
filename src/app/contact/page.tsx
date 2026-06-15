import Link from "next/link";
import { HelpCircle, MessageSquareText, ShieldAlert } from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { LinkButton } from "@/components/ui/Button";

export const metadata = {
  title: "Contact Kurioticket",
};

const contactNotes = [
  "The email address on your Kurioticket account, if you have one.",
  "What you were trying to search, save, or compare.",
  "Any provider page you were redirected to, if relevant.",
];

export default function ContactPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-8 pb-10 sm:pt-10 lg:pt-12">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold text-teal-dark">
            Contact Kurioticket
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            Contact us
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
            Need help with Kurioticket? Use the support page to share account,
            search, saved trip, alert, or provider redirect questions. Please do
            not send full payment card numbers, government ID numbers, or
            sensitive travel document numbers.
          </p>
        </section>

        <section className="mt-8 grid max-w-4xl gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-[0_16px_40px_-28px_rgba(30,27,75,0.45)] sm:p-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-teal/10 text-teal-dark">
              <MessageSquareText size={21} aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-navy">
              Support requests
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
              Kurioticket support is handled through the support form while
              contact options are prepared for launch. The form helps route your
              request with the context our team needs.
            </p>
            <LinkButton href="/support" variant="accent" className="mt-5">
              Go to support
            </LinkButton>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5 shadow-[0_16px_40px_-28px_rgba(30,27,75,0.45)] sm:p-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
              <HelpCircle size={21} aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-navy">
              What to include
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted sm:text-base">
              {contactNotes.map((note) => (
                <li key={note} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal"
                  />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-8 max-w-3xl rounded-2xl border border-amber/30 bg-amber/10 p-5 text-sm leading-6 text-amber sm:p-6 sm:text-base">
          <div className="flex gap-3">
            <ShieldAlert
              className="mt-0.5 shrink-0"
              size={20}
              aria-hidden="true"
            />
            <p>
              If you completed a booking with an airline, hotel, rental car
              company, travel agency, or other external provider, contact that
              provider for booking changes, cancellations, refunds, receipts,
              check-in, or travel documents.
            </p>
          </div>
        </section>

        <section className="mt-8 max-w-3xl text-sm leading-6 text-muted sm:text-base">
          <p>
            For common product questions, visit the{" "}
            <Link
              href="/faq"
              className="font-bold text-teal-dark underline-offset-4 hover:underline"
            >
              FAQ
            </Link>
            .
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
