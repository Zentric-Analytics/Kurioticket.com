"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import type { LegalDocument } from "@/lib/types";
import { legalDeveloperNote } from "@/data/legalDocuments";

export function LegalViewer({ document }: { document: LegalDocument }) {
  return (
    <main className="page-shell flex-1 pt-24 pb-8 sm:pt-28 lg:pt-28">
      <div className="legal-paper rounded-lg border p-4 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/legal" className="text-sm font-semibold text-teal-dark">
              Legal Center
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-navy">{document.title}</h1>
            <p className="mt-2 max-w-3xl text-muted">{document.summary}</p>
            <p className="mt-3 text-sm font-semibold text-muted">Last updated: {document.lastUpdated}</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-navy hover:bg-surface-muted"
          >
            <Printer size={17} />
            Print
          </button>
        </div>

        <div className="grid gap-8 py-6 lg:grid-cols-[260px_1fr]">
          <aside>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Table of contents</h2>
            <nav className="mt-3 grid gap-2">
              {document.sections.map((section) => (
                <a key={section.id} href={`#${section.id}`} className="text-sm font-semibold text-navy hover:text-teal-dark">
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <article className="min-w-0 space-y-8">
            {document.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-xl font-bold text-navy">{section.title}</h2>
                <div className="mt-3 space-y-3 text-base leading-7 text-slate-700">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
            <div className="rounded-md border border-amber/30 bg-amber/10 p-4 text-sm leading-6 text-amber">
              {legalDeveloperNote}
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
