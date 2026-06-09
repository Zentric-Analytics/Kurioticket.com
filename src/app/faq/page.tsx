import Link from "next/link";

import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { generalFaqs } from "@/content/faqs";

export const metadata = {
  title: "Frequently Asked Questions | Kurioticket",
  description:
    "Answers to common questions about comparing flights, hotels, and travel options with Kurioticket.",
};

export default function FaqPage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-gradient-to-b from-[#f8f7ff] via-white to-white">
        <section className="page-shell py-10 sm:py-14 lg:py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-indigo-700">
              Help center
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Frequently asked questions
            </h1>
            <p className="mt-4 text-sm font-medium leading-6 text-slate-700 sm:text-base sm:leading-7">
              Learn how Kurioticket helps you compare flights, hotels, and
              travel options before booking with trusted providers.
            </p>
          </div>

          <section aria-label="General questions" className="mt-8 sm:mt-10">
            <FaqAccordion items={generalFaqs} />
          </section>

          <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 text-sm font-medium leading-6 text-slate-700 sm:p-6 sm:text-base">
            Need more help? Visit the{" "}
            <Link
              href="/support"
              className="font-bold text-indigo-700 underline-offset-4 hover:text-indigo-900 hover:underline"
            >
              support page
            </Link>{" "}
            for service and contact options.
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
