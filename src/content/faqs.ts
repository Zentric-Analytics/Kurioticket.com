export type FaqItem = {
  question: string;
  answer: string;
};

type FaqTranslator = (key: string) => string;

export const homepageMobileFaqLimit = 4;

export const faqItemKeys = [
  ["faqQuestionFindOptions", "faqAnswerFindOptions"],
  ["faqQuestionSellDirectly", "faqAnswerSellDirectly"],
  ["faqQuestionPriceChanges", "faqAnswerPriceChanges"],
  ["faqQuestionCompareProviders", "faqAnswerCompareProviders"],
  ["faqQuestionSecureBooking", "faqAnswerSecureBooking"],
  ["faqQuestionPreferences", "faqAnswerPreferences"],
  ["faqQuestionLiveCached", "faqAnswerLiveCached"],
  ["faqQuestionManageChanges", "faqAnswerManageChanges"],
] as const;

export function getGeneralFaqs(t: FaqTranslator): FaqItem[] {
  return faqItemKeys.map(([questionKey, answerKey]) => ({
    question: t(questionKey),
    answer: t(answerKey),
  }));
}

export const generalFaqs: FaqItem[] = getGeneralFaqs((key) => {
  const fallback: Record<string, string> = {
    faqQuestionFindOptions: "How does Kurioticket find flight and hotel options?",
    faqAnswerFindOptions:
      "Kurioticket searches live offers from travel providers and brings options together in one place so you can compare prices, routes, stays, and details before choosing.",
    faqQuestionSellDirectly: "Does Kurioticket sell tickets or hotel rooms directly?",
    faqAnswerSellDirectly:
      "Kurioticket helps you compare travel options. When you choose an offer, you are sent to the selected provider to review details and complete the booking on that provider’s site.",
    faqQuestionPriceChanges: "Why can prices change after I click an offer?",
    faqAnswerPriceChanges:
      "Prices and availability can change in real time because airlines, hotels, and travel providers update inventory frequently. Always review the final price on the provider’s checkout page before booking.",
    faqQuestionCompareProviders: "Can I compare multiple providers for the same trip?",
    faqAnswerCompareProviders:
      "Yes. Kurioticket is designed to help you compare options side by side so you can evaluate price, timing, route details, hotel details, and overall value.",
    faqQuestionSecureBooking: "How do I complete my booking securely?",
    faqAnswerSecureBooking:
      "Booking and payment are completed on the provider’s checkout flow. You should always review the provider’s terms, cancellation policy, and final price before confirming.",
    faqQuestionPreferences: "Can I set currency and language preferences?",
    faqAnswerPreferences:
      "Yes. Kurioticket lets you set display country/currency preferences, and you can choose any available website language from the language selector.",
    faqQuestionLiveCached: "Are search results live or cached?",
    faqAnswerLiveCached:
      "Kurioticket uses provider search results that can refresh as availability and prices change. This helps show current options, but final availability is confirmed by the provider.",
    faqQuestionManageChanges: "Where do I manage changes or cancellations?",
    faqAnswerManageChanges:
      "Trip changes, cancellations, refunds, and booking support are usually handled by the provider where the booking was completed. Use the confirmation details from that provider for service requests.",
  };

  return fallback[key] ?? key;
});
