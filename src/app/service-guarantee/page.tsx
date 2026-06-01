import {
  ArrowRight,
  Building2,
  Check,
  CircleCheckBig,
  CreditCard,
  FileSearch,
  Headphones,
  Layers3,
  LockKeyhole,
  Map,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

export const metadata = {
  title: "Service Guarantee",
};

const trustBadges = [
  "Trusted Travel Providers",
  "Secure Payments",
  "Transparent Search Results",
  "Travel Deal Comparison",
];

const travelerFeatures = [
  {
    title: "Compare More Options",
    description: "Search flights, hotels, and travel deals across multiple providers.",
    icon: Layers3,
  },
  {
    title: "Transparent Results",
    description: "See available options clearly and make informed travel decisions.",
    icon: FileSearch,
  },
  {
    title: "Easy Travel Planning",
    description: "Find, compare, and organize travel options from a single platform.",
    icon: Map,
  },
];

const serviceCommitments = [
  {
    title: "Trusted Providers",
    description: "We connect travelers with established travel providers and booking partners.",
    icon: Building2,
  },
  {
    title: "Clear Information",
    description: "We strive to present travel information clearly and accurately.",
    icon: CircleCheckBig,
  },
  {
    title: "Secure Experience",
    description: "We prioritize secure browsing and trusted provider connections.",
    icon: LockKeyhole,
  },
  {
    title: "Continuous Improvement",
    description: "We are constantly improving the platform experience for travelers.",
    icon: Sparkles,
  },
];

const howItWorksSteps = [
  "Search flights, hotels, or travel deals.",
  "Compare available options.",
  "Choose the option that fits your trip.",
  "Continue with the selected provider.",
];

const faqs = [
  {
    question: "What does Curioticket do?",
    answer:
      "Curioticket helps travelers compare flights, hotels, and travel deals from trusted providers in one place.",
  },
  {
    question: "How are travel results displayed?",
    answer:
      "Results are shown with available details from providers so travelers can review options clearly before deciding where to continue.",
  },
  {
    question: "Do I book directly on Curioticket?",
    answer:
      "Some travel options may send you to a selected provider, where booking, payment, changes, cancellations, and provider-specific support are completed.",
  },
  {
    question: "How can I get assistance?",
    answer:
      "You can contact our support team for account, search, saved-trip, alert, and platform-related questions through the support page.",
  },
];

export default function ServiceGuaranteePage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.14),transparent_34rem),linear-gradient(180deg,#ffffff_0%,var(--background)_42%,#ffffff_100%)] pt-24 pb-14 sm:pt-28 lg:pt-30">
        <section className="page-shell">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 px-5 py-10 shadow-[0_30px_90px_-45px_rgba(30,27,75,0.55)] sm:px-8 sm:py-14 lg:px-12 lg:py-16">
            <div className="absolute -top-32 right-0 h-72 w-72 rounded-full bg-teal/10 blur-3xl" aria-hidden="true" />
            <div className="absolute -bottom-36 left-1/3 h-72 w-72 rounded-full bg-blue/10 blur-3xl" aria-hidden="true" />

            <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-2 text-sm font-semibold text-teal-dark">
                  <ShieldCheck size={18} />
                  Curioticket service commitment
                </div>
                <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-navy sm:text-5xl lg:text-6xl">
                  Travel with Confidence
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                  Curioticket helps travelers compare flights, hotels, and travel deals from trusted providers in one place.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {trustBadges.map((badge) => (
                    <div
                      key={badge}
                      className="flex items-center gap-3 rounded-2xl border border-border/80 bg-white px-4 py-3 text-sm font-semibold text-navy shadow-[0_14px_35px_-28px_rgba(30,27,75,0.8)]"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal text-white">
                        <Check size={16} strokeWidth={3} />
                      </span>
                      {badge}
                    </div>
                  ))}
                </div>
              </div>

              <Card className="relative border-white/80 bg-gradient-to-br from-navy via-navy-soft to-teal p-6 text-white shadow-[0_30px_80px_-35px_rgba(30,27,75,0.75)] sm:p-7">
                <div className="absolute right-6 top-6 rounded-full bg-white/10 p-3 text-white" aria-hidden="true">
                  <CreditCard size={26} />
                </div>
                <p className="text-sm font-semibold text-white/75">Plan with clarity</p>
                <h2 className="mt-4 max-w-sm text-2xl font-bold tracking-tight sm:text-3xl">
                  Compare travel options before you continue.
                </h2>
                <p className="mt-4 text-sm leading-6 text-white/75">
                  Review providers, search results, and available deal options in a calm, organized experience designed for confident decisions.
                </p>
                <div className="mt-8 grid gap-3 rounded-3xl bg-white/10 p-4 backdrop-blur">
                  {["Flight and hotel search", "Provider redirect clarity", "Account and platform help"].map((item) => (
                    <div key={item} className="flex items-center gap-3 text-sm font-medium text-white">
                      <CircleCheckBig size={18} className="text-white/85" />
                      {item}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section className="page-shell mt-14 sm:mt-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-dark">Why travelers use Curioticket</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              More clarity at every step of trip planning.
            </h2>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {travelerFeatures.map(({ title, description, icon: Icon }) => (
              <Card key={title} className="group p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-32px_rgba(30,27,75,0.65)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/10 text-teal-dark transition group-hover:bg-teal group-hover:text-white">
                  <Icon size={24} />
                </div>
                <h3 className="mt-5 text-xl font-bold text-navy">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="page-shell mt-14 sm:mt-16">
          <div className="rounded-[2rem] border border-border bg-white px-5 py-8 shadow-[0_24px_70px_-42px_rgba(30,27,75,0.5)] sm:px-8 sm:py-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-dark">Our service commitment</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
                  Built around trust, clarity, and secure connections.
                </h2>
              </div>
              <ShieldCheck className="hidden text-teal-dark sm:block" size={44} />
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {serviceCommitments.map(({ title, description, icon: Icon }) => (
                <div key={title} className="rounded-3xl border border-border bg-surface-muted/45 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-teal-dark shadow-sm">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-navy">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="page-shell mt-14 sm:mt-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-dark">How it works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              From search to provider in four clear steps.
            </h2>
          </div>

          <div className="mt-9 grid gap-4 lg:grid-cols-4 lg:gap-0">
            {howItWorksSteps.map((step, index) => (
              <div key={step} className="relative lg:px-2">
                {index < howItWorksSteps.length - 1 ? (
                  <div className="absolute left-[3.25rem] top-8 hidden h-px w-[calc(100%-3rem)] bg-gradient-to-r from-teal/60 to-border lg:block" aria-hidden="true" />
                ) : null}
                <Card className="relative h-full p-5">
                  <div className="flex items-center gap-4 lg:block">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-navy text-lg font-bold text-white shadow-[0_16px_35px_-20px_rgba(30,27,75,0.9)]">
                      {index + 1}
                    </div>
                    <div className="lg:mt-5">
                      <p className="text-sm font-semibold text-teal-dark">Step {index + 1}</p>
                      <p className="mt-1 text-sm leading-6 text-muted">{step}</p>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </section>

        <section className="page-shell mt-14 grid gap-8 sm:mt-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-dark">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              Common service questions.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
              Learn how Curioticket supports comparison, search clarity, and platform-related assistance.
            </p>
          </div>

          <Card className="divide-y divide-border overflow-hidden p-2">
            {faqs.map((item) => (
              <details key={item.question} className="group rounded-2xl px-4 py-4 open:bg-surface-muted/60 sm:px-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-bold text-navy marker:hidden">
                  <span>{item.question}</span>
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-teal-dark shadow-sm transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-muted">{item.answer}</p>
              </details>
            ))}
          </Card>
        </section>

        <section className="page-shell mt-14 sm:mt-16">
          <div className="relative overflow-hidden rounded-[2rem] bg-navy px-5 py-9 text-white shadow-[0_30px_90px_-45px_rgba(30,27,75,0.75)] sm:px-8 sm:py-10 lg:px-10">
            <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.38),transparent_22rem)]" aria-hidden="true" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/85">
                  <Headphones size={18} />
                  Support
                </div>
                <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Need Assistance?</h2>
                <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
                  Our support team can help with account, search, and platform-related questions.
                </p>
              </div>
              <LinkButton href="/support" variant="accent" size="lg" className="w-full rounded-full sm:w-auto">
                Contact Customer Support
                <ArrowRight size={18} />
              </LinkButton>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
