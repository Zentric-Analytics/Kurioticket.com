import { notFound } from "next/navigation";
import { LegalViewer } from "@/components/legal/LegalViewer";
import { isStagingEnvironment } from "@/lib/stagingSafety";
import { getLegalDocument } from "@/services/legalDocumentService";

const APP_LEGAL_SLUGS = new Set(["terms-of-service", "privacy-policy"]);
const HIDE_STAGING_BADGE_CSS = '[data-staging-build="current"] { display: none !important; }';

export const metadata = {
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return [...APP_LEGAL_SLUGS].map((slug) => ({ slug }));
}

export default async function MobileLegalDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const localDevelopment = process.env.NODE_ENV === "development";
  if ((!isStagingEnvironment() && !localDevelopment) || !APP_LEGAL_SLUGS.has(slug)) notFound();

  const document = getLegalDocument(slug);
  if (!document) notFound();

  return (
    <>
      <style>{HIDE_STAGING_BADGE_CSS}</style>
      <LegalViewer document={document} appBrowser />
    </>
  );
}
