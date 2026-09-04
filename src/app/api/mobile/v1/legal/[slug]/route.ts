import { legalDocuments } from "@/data/legalDocuments";
import { availableLocaleOptions, getTranslations } from "@/lib/i18n";
import { localizeLegalDocument } from "@/lib/legal/localizeLegalDocument";

const allowedSlugs = new Set(["terms-of-service", "privacy-policy"]);
const localeAliases: Record<string, string> = { "de-de": "de", "it-it": "it", "fr-fr": "fr", "nl-nl": "nl", "ar-sa": "ar" };

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!allowedSlugs.has(slug)) return Response.json({ error: "Legal document not found" }, { status: 404 });
  const requested = new URL(request.url).searchParams.get("locale")?.trim().toLowerCase();
  const locale = requested ? (localeAliases[requested] ?? requested) : "en-us";
  if (!availableLocaleOptions.some((option) => option.code === locale)) return Response.json({ error: "Unsupported locale" }, { status: 400 });
  const document = legalDocuments.find((candidate) => candidate.slug === slug);
  if (!document) return Response.json({ error: "Legal document not found" }, { status: 404 });
  const dictionary = getTranslations(locale);
  return Response.json({ ...localizeLegalDocument(document, dictionary), lastUpdatedLabel: dictionary["legal.lastUpdated"] || getTranslations("en-us")["legal.lastUpdated"] });
}
