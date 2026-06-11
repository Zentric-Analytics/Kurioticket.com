import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Privacy Policy",
};

const privacySections = [
  {
    title: "Information Kurioticket may collect",
    body: "Kurioticket may collect account information, search details, saved travel preferences, alerts, support messages, and communication preferences when you use the platform.",
  },
  {
    title: "How information is used",
    body: "Information may be used to operate searches, keep accounts working, remember preferences, provide support, send requested communications, improve reliability, and protect the platform from misuse.",
  },
  {
    title: "External providers",
    body: "When you leave Kurioticket for an airline, hotel, rental car company, travel agency, or other provider, that provider handles its own terms, privacy practices, cookies, payments, and booking support.",
  },
  {
    title: "Your choices",
    body: "You can manage account and communication preferences through available Kurioticket account tools. Additional privacy request options should be finalized before public launch.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-8 pb-10 sm:pt-10 lg:pt-12">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold text-teal-dark">
            Kurioticket privacy
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            Privacy policy
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
            This lightweight privacy page summarizes how Kurioticket expects to
            handle information as the platform prepares for launch. It is
            concise by design and should be finalized before public launch.
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
              Final privacy terms should be reviewed by qualified legal counsel
              before public launch. This page does not make unsupported
              compliance claims.
            </p>
          </div>
        </section>

        <section className="mt-8 grid max-w-4xl gap-4">
          {privacySections.map((section) => (
            <article
              key={section.title}
              className="rounded-2xl border border-border bg-white p-5 shadow-[0_16px_40px_-28px_rgba(30,27,75,0.45)] sm:p-6"
            >
              <div className="flex gap-3">
                <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal-dark">
                  <ShieldCheck size={18} aria-hidden="true" />
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
              href="/legal/privacy-policy"
              className="font-bold text-teal-dark underline-offset-4 hover:underline"
            >
              legal center privacy policy
            </Link>
            .
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
