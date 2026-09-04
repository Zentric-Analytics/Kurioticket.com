import { legalDocuments } from "@/data/legalDocuments";
import { availableLocaleOptions, getTranslations } from "@/lib/i18n";
import { getLegalDocumentTranslationNamespace, localizeLegalDocument } from "@/lib/legal/localizeLegalDocument";

const allowedSlugs = new Set(["terms-of-service", "privacy-policy"]);

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!allowedSlugs.has(slug)) return Response.json({ error: "Legal document not found" }, { status: 404 });
  const requested = new URL(request.url).searchParams.get("locale")?.trim().toLowerCase() || "en-us";
  if (!availableLocaleOptions.some((option) => option.code === requested)) return Response.json({ error: "Unsupported locale" }, { status: 400 });
  const document = legalDocuments.find((candidate) => candidate.slug === slug);
  if (!document) return Response.json({ error: "Legal document not found" }, { status: 404 });
  const dictionary = getTranslations(requested);
  const english = getTranslations("en-us");
  const namespace = getLegalDocumentTranslationNamespace(document);
  const sharedTableOfContentsLabel = dictionary["legal.tableOfContents"] || english["legal.tableOfContents"];
  const tableOfContentsLabel = namespace
    ? dictionary[`${namespace}.tableOfContents`] || sharedTableOfContentsLabel
    : sharedTableOfContentsLabel;
  return Response.json({
    ...localizeLegalDocument(document, dictionary),
    lastUpdatedLabel: dictionary["legal.lastUpdated"] || english["legal.lastUpdated"],
    tableOfContentsLabel,
  });
}
