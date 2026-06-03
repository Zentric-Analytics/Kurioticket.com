export type FaqItem = {
  question: string;
  answer: string;
};

export const homepageMobileFaqLimit = 4;

export const generalFaqs: FaqItem[] = [
  {
    question: "How does Kurioticket find flight and hotel options?",
    answer:
      "Kurioticket searches live offers from travel providers and brings options together in one place so you can compare prices, routes, stays, and details before choosing.",
  },
  {
    question: "Does Kurioticket sell tickets or hotel rooms directly?",
    answer:
      "Kurioticket helps you compare travel options. When you choose an offer, you are sent to the selected provider to review details and complete the booking on that provider’s site.",
  },
  {
    question: "Why can prices change after I click an offer?",
    answer:
      "Prices and availability can change in real time because airlines, hotels, and travel providers update inventory frequently. Always review the final price on the provider’s checkout page before booking.",
  },
  {
    question: "Can I compare multiple providers for the same trip?",
    answer:
      "Yes. Kurioticket is designed to help you compare options side by side so you can evaluate price, timing, route details, hotel details, and overall value.",
  },
  {
    question: "How do I complete my booking securely?",
    answer:
      "Booking and payment are completed on the provider’s checkout flow. You should always review the provider’s terms, cancellation policy, and final price before confirming.",
  },
  {
    question: "Can I set currency and language preferences?",
    answer:
      "Yes. Kurioticket supports language and region preferences so the experience can feel more relevant based on how you prefer to search and compare travel options.",
  },
  {
    question: "Are search results live or cached?",
    answer:
      "Kurioticket uses provider search results that can refresh as availability and prices change. This helps show current options, but final availability is confirmed by the provider.",
  },
  {
    question: "Where do I manage changes or cancellations?",
    answer:
      "Trip changes, cancellations, refunds, and booking support are usually handled by the provider where the booking was completed. Use the confirmation details from that provider for service requests.",
  },
];
