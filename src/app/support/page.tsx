import type { ReactNode } from "react";
import {
  BellRing,
  CheckCircle2,
  HelpCircle,
  KeyRound,
  LifeBuoy,
  ListChecks,
  Route,
  Search,
  ShieldAlert,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SupportForm } from "@/components/support/SupportForm";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Customer support",
};

const supportCards = [
  {
    icon: <KeyRound size={22} />,
    title: "Account and sign-in help",
    body: "Get help with account access, sign-in, sign-up, profile questions, and Curioticket Premium tools.",
  },
  {
    icon: <Search size={22} />,
    title: "Search and results help",
    body: "Tell us about flight or hotel search issues, missing results, filters, website bugs, or confusing platform behavior.",
  },
  {
    icon: <BellRing size={22} />,
    title: "Saved trips and alerts",
    body: "We can review saved trips, recent searches, price alerts, notifications, and other Curioticket planning features.",
  },
  {
    icon: <Route size={22} />,
    title: "Booking/provider redirect help",
    body: "If a redirect to an airline, hotel, or travel partner did not work as expected, share what happened and where you were sent.",
  },
];

const curioticketCanHelp = [
  "Account access, sign-in, and sign-up issues",
  "Saved trips, recent searches, and price alerts",
  "Flight or hotel search problems on Curioticket",
  "Partner redirect issues before completing a booking",
  "Curioticket Premium, tools, website bugs, and general platform questions",
];

const providerHandles = [
  "Completed bookings made with an airline, hotel, or booking partner",
  "External payment receipts, refunds, cancellations, and provider disputes",
  "Flight or hotel changes, check-in, boarding, and travel documents",
  "Fare rules, baggage rules, room policies, and provider-specific requirements",
];

const faqs = [
  {
    question: "Already booked with a provider?",
    answer:
      "Contact the airline, hotel, or booking partner listed on your confirmation for changes, cancellations, receipts, refunds, and travel documents.",
  },
  {
    question: "Can Curioticket change my booking?",
    answer:
      "Curioticket cannot directly modify bookings completed outside our platform. We can help you understand where you were redirected and what details may help the provider locate your booking.",
  },
  {
    question: "Why was I sent to another provider?",
    answer:
      "Curioticket helps you search and compare options, then may send you to a travel provider to review final terms and complete the booking.",
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
          <p className="mt-4 text-base leading-7 text-muted">
            Curioticket support helps with account access, search issues, saved trips, price alerts, partner redirects, Premium tools, and platform questions. For completed bookings made with external airlines, hotels, or travel providers, contact that provider directly for booking changes, refunds, cancellations, check-in, and travel documents.
          </p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Quick support topics">
          {supportCards.map((card) => (
            <SupportCard key={card.title} icon={card.icon} title={card.title} body={card.body} />
          ))}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <BoundaryCard
            icon={<CheckCircle2 size={22} />}
            title="What Curioticket can help with"
            items={curioticketCanHelp}
            tone="help"
          />
          <BoundaryCard
            icon={<ShieldAlert size={22} />}
            title="What your airline, hotel, or booking provider handles"
            items={providerHandles}
            tone="provider"
          />
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <div className="grid gap-5">
            <Card className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-teal/10 p-2 text-teal">
                  <HelpCircle size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-navy">Before you contact us</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Include the email on your Curioticket account, what you were trying to do, the route or hotel if relevant, and any provider page you were redirected to. Please do not send full payment card numbers or sensitive travel document numbers.
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {faqs.map((faq) => (
                <Card key={faq.question} className="p-5">
                  <h3 className="font-bold text-navy">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{faq.answer}</p>
                </Card>
              ))}
            </div>
          </div>

          <section aria-labelledby="support-form-heading">
            <div className="mb-4 rounded-2xl border border-border bg-white p-5 shadow-[0_16px_40px_-24px_rgba(30,27,75,0.45)]">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-navy/5 p-2 text-navy">
                  <LifeBuoy size={22} />
                </div>
                <div>
                  <h2 id="support-form-heading" className="text-xl font-bold text-navy">
                    Contact customer support
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Tell us what happened and our support team will review your request. If your question is about an external booking, include the provider name so we can point you in the right direction.
                  </p>
                </div>
              </div>
            </div>
            <SupportForm />
          </section>
        </section>
      </main>
      <Footer />
    </>
  );
}

function SupportCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <Card className="h-full p-5 transition hover:border-teal hover:shadow-md">
      <div className="text-teal">{icon}</div>
      <h2 className="mt-3 font-bold text-navy">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </Card>
  );
}

function BoundaryCard({
  icon,
  title,
  items,
  tone,
}: {
  icon: ReactNode;
  title: string;
  items: string[];
  tone: "help" | "provider";
}) {
  const iconClass = tone === "help" ? "bg-teal/10 text-teal" : "bg-amber-50 text-amber-700";
  const bulletClass = tone === "help" ? "text-teal" : "text-amber-700";

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className={`rounded-full p-2 ${iconClass}`}>{icon}</div>
        <div>
          <h2 className="text-xl font-bold text-navy">{title}</h2>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted">
            {items.map((item) => (
              <li key={item} className="flex gap-2">
                <ListChecks size={17} className={`mt-1 shrink-0 ${bulletClass}`} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
