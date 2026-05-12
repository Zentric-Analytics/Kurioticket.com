import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { LegalViewer } from "@/components/legal/LegalViewer";
import { getLegalDocument, listLegalDocuments } from "@/services/legalDocumentService";

export function generateStaticParams() {
  return listLegalDocuments().map((document) => ({ slug: document.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const document = getLegalDocument(slug);
  return { title: document?.title || "Legal Document" };
}

export default async function LegalDocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const document = getLegalDocument(slug);
  if (!document) notFound();

  return (
    <>
      <AppHeader />
      <LegalViewer document={document} />
      <Footer />
    </>
  );
}
