import { legalDeveloperNote, legalDocuments } from "@/data/legalDocuments";
import { normalizeSlug } from "@/lib/utils";

export function listLegalDocuments() {
  return legalDocuments;
}

export function getLegalDocument(slug: string) {
  return legalDocuments.find((document) => document.slug === normalizeSlug(slug)) || null;
}

export function getLegalNote() {
  return legalDeveloperNote;
}
