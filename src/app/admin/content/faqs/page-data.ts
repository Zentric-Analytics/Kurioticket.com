import { faqItemKeys, getGeneralFaqs, homepageMobileFaqLimit } from "@/content/faqs";
import { carsFaqItems } from "@/data/carsLandingContent";
import { dictionaries, getTranslations } from "@/lib/i18n";
import { translations as englishTranslations } from "@/lib/i18n/en";

export const faqCollectionFilters = ["ALL", "GENERAL", "SUPPORT", "CARS"] as const;
export type FaqCollection = Exclude<(typeof faqCollectionFilters)[number], "ALL">;
export type FaqCollectionFilter = (typeof faqCollectionFilters)[number];
export type FaqInventorySearchParams = { q?: string; collection?: string };

export type FaqInventoryDefinition = {
  rowId: string;
  collection: FaqCollection;
  faqId: string;
  questionKey: string;
  answerKey: string;
  englishFallbackQuestion: string;
  englishFallbackAnswer: string;
  publicSurface: string;
  localizationBehaviour: string;
  duplicateId: boolean;
  duplicateQuestionKey: boolean;
  duplicateAnswerKey: boolean;
  duplicateFallbackQuestion: boolean;
  missingFallbackQuestion: boolean;
  missingFallbackAnswer: boolean;
  translatedQuestionCollision: boolean;
};

type BaseFaqDefinition = Omit<FaqInventoryDefinition,
  "rowId" | "duplicateId" | "duplicateQuestionKey" | "duplicateAnswerKey" |
  "duplicateFallbackQuestion" | "missingFallbackQuestion" | "missingFallbackAnswer" |
  "translatedQuestionCollision">;

const normalized = (value: string) => value.trim().toLocaleLowerCase();

export function deriveFaqDisplayId(questionKey: string) {
  return questionKey
    .replace(/Question$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLocaleLowerCase();
}

function repeatedValues(definitions: BaseFaqDefinition[], selector: (definition: BaseFaqDefinition) => string) {
  const counts = new Map<string, number>();
  for (const definition of definitions) {
    const value = normalized(selector(definition));
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([value]) => value));
}

export function detectFaqDefinitionDuplicates(definitions: BaseFaqDefinition[]) {
  return {
    ids: repeatedValues(definitions, (item) => item.faqId),
    questionKeys: repeatedValues(definitions, (item) => item.questionKey),
    answerKeys: repeatedValues(definitions, (item) => item.answerKey),
    fallbackQuestions: repeatedValues(definitions, (item) => item.englishFallbackQuestion),
  };
}

function translatedCollisionKeys() {
  const collisions = new Set<string>();
  for (const locale of Object.keys(dictionaries)) {
    const dictionary = getTranslations(locale);
    const translate = (key: string) => dictionary[key] ?? englishTranslations[key] ?? "";
    if (getGeneralFaqs(translate).length === faqItemKeys.length) continue;

    const keysByQuestion = new Map<string, string[]>();
    for (const [questionKey] of faqItemKeys) {
      const question = normalized(translate(questionKey));
      const keys = keysByQuestion.get(question) ?? [];
      keys.push(questionKey);
      keysByQuestion.set(question, keys);
    }
    for (const keys of keysByQuestion.values()) {
      if (keys.length > 1) keys.forEach((key) => collisions.add(key));
    }
  }
  return collisions;
}

export function selectFaqInventoryRows(): FaqInventoryDefinition[] {
  const generalDefinitions: BaseFaqDefinition[] = faqItemKeys.map(([questionKey, answerKey], index) => {
    const collection: FaqCollection = questionKey.startsWith("supportFaq") ? "SUPPORT" : "GENERAL";
    return {
      collection,
      faqId: deriveFaqDisplayId(questionKey),
      questionKey,
      answerKey,
      englishFallbackQuestion: englishTranslations[questionKey] ?? "",
      englishFallbackAnswer: englishTranslations[answerKey] ?? "",
      publicSurface: collection === "SUPPORT"
        ? "Full FAQ page"
        : index < homepageMobileFaqLimit
          ? "Full FAQ page · homepage mobile limited set"
          : "Full FAQ page",
      localizationBehaviour: "Localised at runtime; translated question collisions are de-duplicated",
    };
  });
  const carDefinitions: BaseFaqDefinition[] = carsFaqItems.map((item) => ({
    collection: "CARS",
    faqId: item.id,
    questionKey: item.questionKey,
    answerKey: item.answerKey,
    englishFallbackQuestion: englishTranslations[item.questionKey] ?? "",
    englishFallbackAnswer: englishTranslations[item.answerKey] ?? "",
    publicSurface: "Cars landing page",
    localizationBehaviour: "Localised at runtime with English fallback",
  }));
  const definitions = [...generalDefinitions, ...carDefinitions];
  const duplicates = detectFaqDefinitionDuplicates(definitions);
  const collisionKeys = translatedCollisionKeys();

  return definitions.map((definition, index) => ({
    ...definition,
    rowId: `${index}:${definition.collection}:${definition.faqId}`,
    duplicateId: duplicates.ids.has(normalized(definition.faqId)),
    duplicateQuestionKey: duplicates.questionKeys.has(normalized(definition.questionKey)),
    duplicateAnswerKey: duplicates.answerKeys.has(normalized(definition.answerKey)),
    duplicateFallbackQuestion: duplicates.fallbackQuestions.has(normalized(definition.englishFallbackQuestion)),
    missingFallbackQuestion: !definition.englishFallbackQuestion.trim(),
    missingFallbackAnswer: !definition.englishFallbackAnswer.trim(),
    translatedQuestionCollision: collisionKeys.has(definition.questionKey),
  }));
}

export function getFaqInventorySummary(rows = selectFaqInventoryRows()) {
  return {
    total: rows.length,
    generalAndSupport: rows.filter((row) => row.collection !== "CARS").length,
    cars: rows.filter((row) => row.collection === "CARS").length,
    collections: new Set(rows.map((row) => row.collection === "CARS" ? "cars" : "general-support")).size,
  };
}

export function parseFaqInventorySearchParams(params?: FaqInventorySearchParams) {
  const q = params?.q?.trim() ?? "";
  const collection = faqCollectionFilters.includes(params?.collection as FaqCollectionFilter)
    ? params?.collection as FaqCollectionFilter
    : "ALL";
  return { q, collection };
}

export function filterFaqInventoryRows(rows: FaqInventoryDefinition[], filters: ReturnType<typeof parseFaqInventorySearchParams>) {
  const query = normalized(filters.q);
  return rows.filter((row) => {
    const matchesSearch = !query || [row.faqId, row.questionKey, row.answerKey, row.englishFallbackQuestion]
      .some((value) => normalized(value).includes(query));
    return matchesSearch && (filters.collection === "ALL" || row.collection === filters.collection);
  });
}

export function formatFaqCollection(collection: FaqCollection) {
  if (collection === "GENERAL") return "General product";
  if (collection === "SUPPORT") return "Support";
  return "Cars";
}

export function hasFaqInventoryIssues(row: FaqInventoryDefinition) {
  return row.duplicateId || row.duplicateQuestionKey || row.duplicateAnswerKey
    || row.duplicateFallbackQuestion || row.missingFallbackQuestion
    || row.missingFallbackAnswer || row.translatedQuestionCollision;
}
