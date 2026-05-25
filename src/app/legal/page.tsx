import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { getLegalNote, listLegalDocuments } from "@/services/legalDocumentService";

export const metadata = {
  title: "Legal Center",
};

export default function LegalPage() {
  const documents = listLegalDocuments();
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-24 pb-8 sm:pt-28 lg:pt-28">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-teal-dark">Legal document system</p>
          <h1 className="mt-1 text-3xl font-bold text-navy">Legal Center</h1>
          <p className="mt-3 text-muted">{getLegalNote()}</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {documents.map((document) => (
            <Link key={document.slug} href={`/legal/${document.slug}`}>
              <Card className="h-full p-5 transition hover:border-teal hover:shadow-md">
                <h2 className="font-bold text-navy">{document.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{document.summary}</p>
                <p className="mt-3 text-xs font-semibold text-teal-dark">Last updated: {document.lastUpdated}</p>
              </Card>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
