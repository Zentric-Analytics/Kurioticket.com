import { LegalPageContent } from "./LegalPageContent";
import { listLegalDocuments } from "@/services/legalDocumentService";

export const metadata = {
  title: "Legal Center",
};

export default function LegalPage() {
  const documents = listLegalDocuments();

  return <LegalPageContent documents={documents} />;
}
