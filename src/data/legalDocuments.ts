import type { LegalDocument } from "@/lib/types";
import { translations as enTranslations } from "@/lib/i18n/en";
import {
  getCaliforniaSellerOfTravelNotice,
  getCompanyContactSummary,
  getProviderBoundarySummary,
  legalProfile,
} from "@/data/legalProfile";

const lastUpdated = "May 11, 2026";

const formatLegalProfileDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

export const legalDocuments: LegalDocument[] = [
  {
    slug: "terms-of-service",
    title: "Terms of Service",
    summary:
      "Rules for using Kurioticket search, accounts, dashboards, saved travel tools, and partner redirects.",
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
    title: enTranslations["legal.privacy.title"],
    summary: enTranslations["legal.privacy.summary"],
    lastUpdated,
    sections: [
      {
        id: "data-we-collect",
        title: enTranslations["legal.privacy.sections.data-we-collect.title"],
        paragraphs: [
          enTranslations["legal.privacy.sections.data-we-collect.paragraph1"],
          enTranslations["legal.privacy.sections.data-we-collect.paragraph2"],
        ],
      },
      {
        id: "vendors",
        title: enTranslations["legal.privacy.sections.vendors.title"],
        paragraphs: [
          enTranslations["legal.privacy.sections.vendors.paragraph1"],
          enTranslations["legal.privacy.sections.vendors.paragraph2"],
        ],
      },
      {
        id: "choices",
        title: enTranslations["legal.privacy.sections.choices.title"],
        paragraphs: [
          enTranslations["legal.privacy.sections.choices.paragraph1"],
          enTranslations["legal.privacy.sections.choices.paragraph2"],
        ],
      },
    ],
  },
  {
    slug: "cookie-policy",
    title: "Cookie Policy",
    summary:
      "How Kurioticket uses cookies and similar technologies for authentication, security, preferences, analytics, and performance.",
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
    slug: "privacy-choices",
    title: "Privacy Choices",
    summary:
      "How users can make privacy and account requests or manage available account and alert choices.",
    lastUpdated,
    sections: [
      {
        id: "requests",
        title: "Privacy Requests",
        paragraphs: [
          `You can contact ${legalProfile.contact.privacyEmail} for privacy requests, including requests to access, correct, delete, or ask questions about account or personal data.`,
          "Kurioticket may need to verify your identity and account relationship before completing certain requests, and some information may be retained where required or permitted by law, security needs, fraud prevention, or dispute handling.",
        ],
      },
      {
        id: "account-alerts",
        title: "Account and Alert Choices",
        paragraphs: [
          "Where account settings are available, you can manage account details, saved travel preferences, and alerts through those settings.",
          "You may unsubscribe from marketing emails or adjust alert preferences using available unsubscribe links, account settings, or by contacting support for help with preferences.",
        ],
      },
      {
        id: "tracking",
        title: "Advertising and Analytics Choices",
        paragraphs: [
          "Kurioticket does not currently use active ads or third-party analytics tracking tools.",
          "If Kurioticket adds ads or analytics later, Kurioticket should update its policies and offer applicable choices where required by law.",
        ],
      },
    ],
  },
  {
    slug: "affiliate-disclosure",
    title: "Affiliate Disclosure",
    summary:
      "How Kurioticket may earn commissions when users click or book through trusted partners.",
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
    summary:
      "Clarifies that purchases, ticketing, refunds, cancellations, and payment for travel inventory happen outside Kurioticket.",
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
    slug: "price-availability-disclaimer",
    title: "Price & Availability Disclaimer",
    summary:
      "Explains why travel prices, fare rules, room rates, and availability can change.",
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
    summary:
      "What happens when Kurioticket redirects users to airlines, hotels, affiliate partners, or travel providers.",
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
  {
    slug: "california-seller-of-travel-notice",
    title: "California Seller of Travel Notice",
    summary:
      "California Seller of Travel registration notice and provider-payment boundaries for Kurioticket.",
    lastUpdated,
    sections: [
      {
        id: "registration",
        title: "Registration Information",
        paragraphs: [
          `${legalProfile.californiaSellerOfTravel.registeredLegalName} is registered as a California Seller of Travel under Registration No. ${legalProfile.californiaSellerOfTravel.registrationNumber}.`,
          `Registration valid from ${formatLegalProfileDate(legalProfile.californiaSellerOfTravel.validFrom)}. Registration expires ${formatLegalProfileDate(legalProfile.californiaSellerOfTravel.expires)}.`,
          getCaliforniaSellerOfTravelNotice(),
        ],
      },
      {
        id: "platform-model",
        title: "Search-and-Redirect Model",
        paragraphs: [
          `Kurioticket operates as a ${legalProfile.businessModel.platformDescription.toLowerCase()} Users can search and compare travel options for ${legalProfile.productScope.join(", ")} and may be redirected to external providers to continue booking or purchase steps.`,
          getProviderBoundarySummary(),
        ],
      },
      {
        id: "external-providers",
        title: "External Provider Responsibilities",
        paragraphs: [
          `External providers handle ${legalProfile.supportBoundary.externalProvidersHandle.join(", ")}. Review the external provider's terms, policies, prices, and confirmations before completing any travel purchase.`,
        ],
      },
      {
        id: "contact",
        title: "Contact",
        paragraphs: [getCompanyContactSummary()],
      },
    ],
  },
  {
    slug: "legal-notice-company-information",
    title: "Legal Notice & Company Information",
    summary:
      "Public company, contact, product scope, business model, and legal registration information for Kurioticket.",
    lastUpdated,
    sections: [
      {
        id: "company",
        title: "Company Information",
        paragraphs: [
          getCompanyContactSummary(),
          `Product scope: ${legalProfile.productScope.join(", ")}.`,
        ],
      },
      {
        id: "business-model",
        title: "Business Model",
        paragraphs: [
          `Kurioticket is a ${legalProfile.businessModel.platformDescription.toLowerCase()} It helps users search and compare travel options and redirect to external providers.`,
          getProviderBoundarySummary(),
        ],
      },
      {
        id: "registration-reference",
        title: "California Seller of Travel Reference",
        paragraphs: [getCaliforniaSellerOfTravelNotice()],
      },
    ],
  },
  {
    slug: "acceptable-use-policy",
    title: "Acceptable Use Policy",
    summary:
      "Behavior rules for safe, fair, lawful use of Kurioticket systems.",
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
    summary:
      "How users may request account deletion and what data may need to be retained.",
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
    slug: "security-statement",
    title: "Security Statement",
    summary:
      "High-level user-facing security practices and reporting contacts for Kurioticket.",
    lastUpdated,
    sections: [
      {
        id: "account-security",
        title: "Account Security",
        paragraphs: [
          "Kurioticket uses account sign-in, session protection, and access controls to support safer account experiences.",
          "You are responsible for protecting your password, using a secure email account, and signing out of shared devices.",
        ],
      },
      {
        id: "provider-boundaries",
        title: "Provider and Support Boundaries",
        paragraphs: [
          getProviderBoundarySummary(),
          "Before entering payment or traveler information on an external provider page, verify that you are on the expected provider website and review that provider's terms, privacy policy, and security practices.",
        ],
      },
      {
        id: "reporting",
        title: "Reporting Security Concerns",
        paragraphs: [
          `Please report security concerns to ${legalProfile.contact.legalEmail} or ${legalProfile.contact.supportEmail}. Do not include passwords, full payment card details, or other highly sensitive information in ordinary support messages.`,
        ],
      },
    ],
  },
  {
    slug: "accessibility-statement",
    title: "Accessibility Statement",
    summary:
      "Kurioticket's accessibility goals and support contact for accessibility issues.",
    lastUpdated,
    sections: [
      {
        id: "commitment",
        title: "Accessibility Commitment",
        paragraphs: [
          "Kurioticket aims to provide accessible travel search, account, dashboard, and support experiences for users.",
          "We work to improve usability as the service evolves, but this statement does not claim a specific accessibility certification or verified conformance level.",
        ],
      },
      {
        id: "contact",
        title: "Accessibility Support",
        paragraphs: [
          `If you experience an accessibility issue, contact ${legalProfile.contact.supportEmail} with the page, feature, assistive technology or browser involved, and a description of the problem so we can review it.`,
        ],
      },
    ],
  },
];

export const legalDeveloperNote = enTranslations["legal.privacy.developerNote"];
