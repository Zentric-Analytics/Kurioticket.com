import { HelpCircle } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SupportForm } from "@/components/support/SupportForm";

export const metadata = {
  title: "Customer support",
};

const supportFaqs = [
  {
    question: "Account and sign-in help",
    answer:
      "Curioticket can help with account access, sign-in issues, sign-up issues, profile access, and account-related platform problems.",
  },
  {
    question: "Search and results help",
    answer:
      "Curioticket can help when flight or hotel search is not working, results are not loading, filters are confusing, or prices and providers are not displaying as expected.",
  },
  {
    question: "Saved trips and alerts",
    answer:
      "Curioticket can help with saved trips, recent searches, price alerts, notification issues, and account-linked travel tools.",
  },
  {
    question: "Booking/provider redirect help",
    answer:
      "Curioticket can help if a redirect to a partner or provider fails, opens the wrong page, or does not preserve the selected trip or search details.",
  },
  {
    question: "Already booked with a provider?",
    answer:
      "If your booking was completed with an airline, hotel, travel agency, or external provider, that provider is responsible for booking changes, refunds, cancellations, check-in, boarding, receipts, and travel documents.",
  },
  {
    question: "Can Curioticket change my booking?",
    answer:
      "Curioticket can only help with bookings made directly through Curioticket if and when direct booking is supported. For bookings completed with external providers, contact that provider directly.",
  },
  {
    question: "Why was I sent to another provider?",
    answer:
      "Curioticket is a travel search and comparison platform, and some results redirect to trusted providers where you complete booking, payment, and provider-specific support.",
  },
];

export default function SupportPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-24 pb-10 sm:pt-28 lg:pt-28">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold text-teal-dark">Curioticket help desk</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-navy">Customer support</h1>
        </section>

        <section className="mt-6 max-w-3xl">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-teal/10 p-2 text-teal">
              <HelpCircle size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-navy">Before you contact us</h2>
              <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
                Include the email on your Curioticket account, what you were trying to do, the route or hotel if relevant, and any provider page you were redirected to. Please do not send full payment card numbers or sensitive travel document numbers.
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Create a support ticket" className="mt-8 max-w-3xl">
          <SupportForm />
        </section>

        <section aria-labelledby="support-faq-heading" className="mt-10 max-w-3xl">
          <h2 id="support-faq-heading" className="text-2xl font-bold tracking-tight text-navy">
            Frequently asked questions
          </h2>

          <div className="mt-5 grid gap-x-8 gap-y-1">
            {supportFaqs.map((item) => (
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
      </main>
      <Footer />
    </>
  );
}
