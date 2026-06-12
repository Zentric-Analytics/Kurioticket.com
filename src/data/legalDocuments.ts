import type { LegalDocument } from "@/lib/types";
import { translations as englishTranslations } from "@/lib/i18n/en";

const lastUpdated = englishTranslations.legalPrivacyPolicyLastUpdatedDate;

export const legalDocuments: LegalDocument[] = [
  {
    slug: "terms-of-service",
    title: "Terms of Service",
    summary: "Rules for using Kurioticket search, accounts, dashboards, saved travel tools, and partner redirects.",
    lastUpdated,
    sections: [
      {
        id: "overview",
        title: "Overview",
        paragraphs: [
          "Kurioticket LLC (“Kurioticket,” “we,” “us,” or “our”) operates a travel search and comparison platform that helps users search flights, hotels, cars, compare provider options, save travel plans, and create alerts.",
          "Kurioticket is not an airline, hotel, online travel agency, travel agency, payment processor for travel purchases, or ticket issuer. Purchases, fare rules, ticketing, itinerary changes, cancellations, refunds, boarding, check-in, and travel documents are handled by the external provider.",
        ],
      },
      {
        id: "accounts",
        title: "Accounts",
        paragraphs: [
          "You may search and view travel results without an account. An account is required for saved flights, saved hotels, saved searches, alerts, dashboards, and support tickets.",
          "You are responsible for safeguarding your login credentials and for activity under your account.",
        ],
      },
      {
        id: "acceptable-use",
        title: "Acceptable Use",
        paragraphs: [
          "You may not abuse search, alert, support, account, or provider-redirect systems; reverse engineer provider integrations; attempt to bypass rate limits; or use Kurioticket for fraudulent, unlawful, or harmful activity.",
          "We may suspend access if activity threatens platform reliability, provider relationships, service security, or user safety.",
        ],
      },
      {
        id: "partner-services",
        title: "Partner Services",
        paragraphs: [
          "Travel results may include prices, availability, policies, route data, hotel data, and external provider links supplied by APIs, airlines, hotels, or affiliate partners.",
          "Partner terms apply once you leave Kurioticket or complete a transaction with a partner. Review all fare, hotel, baggage, change, refund, visa, and traveler requirements before purchase.",
        ],
      },
    ],
  },
  {
    slug: "privacy-policy",
    title: englishTranslations.legalPrivacyPolicyTitle,
    summary: englishTranslations.legalPrivacyPolicySummary,
    lastUpdated: englishTranslations.legalPrivacyPolicyLastUpdatedDate,
    sections: [
      {
        id: "data-we-collect",
        title: englishTranslations.legalPrivacyPolicyDataWeCollectTitle,
        paragraphs: [
          englishTranslations.legalPrivacyPolicyDataWeCollectAccountParagraph,
          englishTranslations.legalPrivacyPolicyDataWeCollectProductParagraph,
        ],
      },
      {
        id: "vendors",
        title: englishTranslations.legalPrivacyPolicyServiceProvidersTitle,
        paragraphs: [
          englishTranslations.legalPrivacyPolicyServiceProvidersOperationsParagraph,
          englishTranslations.legalPrivacyPolicyServiceProvidersCardsParagraph,
        ],
      },
      {
        id: "choices",
        title: englishTranslations.legalPrivacyPolicyYourChoicesTitle,
        paragraphs: [
          englishTranslations.legalPrivacyPolicyYourChoicesRequestsParagraph,
          englishTranslations.legalPrivacyPolicyYourChoicesRetentionParagraph,
        ],
      },
    ],
  },
  {
    slug: "cookie-policy",
    title: "Cookie Policy",
    summary: "How Kurioticket uses cookies and similar technologies for authentication, security, preferences, analytics, and performance.",
    lastUpdated,
    sections: [
      {
        id: "use",
        title: "How Cookies Are Used",
        paragraphs: [
          "Kurioticket may use cookies for authentication sessions, security, fraud prevention, preference storage, analytics, performance monitoring, and feature experiments.",
          "Some cookies are necessary for login, dashboard access, support tickets, saved travel features, security, and preferences.",
        ],
      },
      {
        id: "third-parties",
        title: "Third-Party Technologies",
        paragraphs: [
          "Authentication providers, analytics tools, hosting infrastructure, and security services may set or read cookies as needed to provide secure services.",
          "External provider sites have their own cookie practices after redirect.",
        ],
      },
      {
        id: "controls",
        title: "Controls",
        paragraphs: [
          "You can control cookies through your browser settings. Blocking necessary cookies may prevent login, dashboards, saved items, preferences, and support tools from working correctly.",
        ],
      },
    ],
  },
  {
    slug: "affiliate-disclosure",
    title: "Affiliate Disclosure",
    summary: "How Kurioticket may earn commissions when users click or book through trusted partners.",
    lastUpdated,
    sections: [
      {
        id: "model",
        title: "Affiliate Model",
        paragraphs: [
          "Kurioticket offers free flight and hotel search without service fees. We may earn affiliate commissions when users click, book, or purchase through airline, hotel, or travel partner links.",
          "Kurioticket may receive compensation from partners when users click or book through provider links. This helps operate and improve the service.",
        ],
      },
      {
        id: "ranking",
        title: "Ranking Integrity",
        paragraphs: [
          "Kurioticket aims to rank results by user value signals such as price, duration, stops, confidence, comfort, and stress reduction. Affiliate relationships should not create fake urgency, hidden fees, or misleading recommendations.",
        ],
      },
    ],
  },
  {
    slug: "refund-booking-disclaimer",
    title: "Refund & External Provider Disclaimer",
    summary: "Clarifies that purchases, ticketing, refunds, cancellations, and payment for travel inventory happen outside Kurioticket.",
    lastUpdated,
    sections: [
      {
        id: "no-ticketing",
        title: "No Direct Ticket Issuing",
        paragraphs: [
          "Kurioticket does not sell airline tickets or hotel reservations. We redirect users to external airlines, hotels, affiliate partners, or travel providers to continue comparison and purchase steps.",
          "Your purchase contract is with the external provider that accepts your payment, not Kurioticket.",
        ],
      },
      {
        id: "refunds",
        title: "Refunds and Changes",
        paragraphs: [
          "Refunds, credits, schedule changes, cancellations, missed connections, check-in issues, baggage disputes, and purchase problems are handled by the external airline, hotel, or travel provider.",
          "Kurioticket support can help you understand platform usage and travel guidance boundaries, but cannot override partner or airline policies.",
        ],
      },
    ],
  },
  {
    slug: "acceptable-use-policy",
    title: "Acceptable Use Policy",
    summary: "Behavior rules for safe, fair, lawful use of Kurioticket systems.",
    lastUpdated,
    sections: [
      {
        id: "prohibited",
        title: "Prohibited Conduct",
        paragraphs: [
          "You may not scrape Kurioticket, scrape airline websites through Kurioticket, attack provider APIs, automate abusive searches, create fraudulent accounts, test stolen cards, spam support, or interfere with platform reliability.",
          "You may not use Kurioticket to facilitate unlawful travel activity, harassment, fraud, abuse, or unauthorized access.",
        ],
      },
      {
        id: "enforcement",
        title: "Enforcement",
        paragraphs: [
          "We may throttle, suspend, remove, or block access when needed to protect users, partners, providers, service security, and platform operations.",
        ],
      },
    ],
  },
  {
    slug: "data-deletion-policy",
    title: "Data Deletion Policy",
    summary: "How users may request account deletion and what data may need to be retained.",
    lastUpdated,
    sections: [
      {
        id: "request",
        title: "Deletion Requests",
        paragraphs: [
          "You may request account deletion from account settings or support. We will process deletion requests consistent with applicable law, identity verification needs, fraud prevention, legal obligations, and security requirements.",
        ],
      },
      {
        id: "retention",
        title: "Retained Records",
        paragraphs: [
          "Some records may be retained for legitimate business, security, analytics, legal, abuse prevention, or dispute-resolution purposes. We minimize retained personal data where practical.",
        ],
      },
    ],
  },
  {
    slug: "price-availability-disclaimer",
    title: "Price & Availability Disclaimer",
    summary: "Explains why travel prices, fare rules, room rates, and availability can change.",
    lastUpdated,
    sections: [
      {
        id: "change",
        title: "Prices Can Change",
        paragraphs: [
          "Flight and hotel prices, taxes, fees, baggage rules, cabin availability, rooms, schedules, and policies can change quickly and may differ by the time you reach a provider purchase page.",
          "Kurioticket aims to compare current provider data, but provider delays, rate limits, cache windows, currency conversion, partner rules, and user selections can affect displayed information.",
        ],
      },
      {
        id: "verify",
        title: "Verify Before Payment",
        paragraphs: [
          "Always review the external provider site before purchase. The external provider site is the authoritative source for final price, availability, fare conditions, room conditions, and purchase terms.",
        ],
      },
    ],
  },
  {
    slug: "partner-redirect-disclaimer",
    title: "Partner Redirect Disclaimer",
    summary: "What happens when Kurioticket redirects users to airlines, hotels, affiliate partners, or travel providers.",
    lastUpdated,
    sections: [
      {
        id: "redirect",
        title: "Secure Redirects",
        paragraphs: [
          "When you continue to an external provider, Kurioticket redirects you to an airline, hotel, affiliate partner, or travel provider. We may log redirect metadata such as provider, route, price, timestamp, user type, and source page for analytics, support, abuse prevention, and affiliate tracking.",
          "Kurioticket does not auto-fill airline websites, scrape airline websites, or complete partner purchases on your behalf.",
        ],
      },
      {
        id: "external-terms",
        title: "External Terms",
        paragraphs: [
          "External partner sites are governed by their own terms, privacy policies, refund policies, cookies, accessibility practices, and customer support processes.",
        ],
      },
    ],
  },
];

export const legalDeveloperNote =
  englishTranslations.legalPrivacyPolicyDeveloperNote;
