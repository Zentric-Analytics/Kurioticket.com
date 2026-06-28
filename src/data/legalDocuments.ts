import type { LegalDocument } from "@/lib/types";
import { translations as enTranslations } from "@/lib/i18n/en";
import {
  getCaliforniaSellerOfTravelNotice,
  getCompanyContactSummary,
  getProviderBoundarySummary,
  legalProfile,
} from "./legalProfile";

const lastUpdated = "May 11, 2026";
const legalNoticeLastUpdated = "June 28, 2026";

const legalMonthNames: Record<string, string> = {
  "01": "January",
  "02": "February",
  "03": "March",
  "04": "April",
  "05": "May",
  "06": "June",
  "07": "July",
  "08": "August",
  "09": "September",
  "10": "October",
  "11": "November",
  "12": "December",
};

function formatLegalProfileDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${legalMonthNames[month] || month} ${day}, ${year}`;
}

function formatProductScope(products: string[]) {
  if (products.length <= 1) {
    return products.join("");
  }

  return `${products.slice(0, -1).join(", ")}, and ${products[products.length - 1]}`;
}

const californiaSellerOfTravel = legalProfile.californiaSellerOfTravel;
const californiaSellerOfTravelNotice = getCaliforniaSellerOfTravelNotice();
const californiaSellerOfTravelValidFrom = formatLegalProfileDate(
  californiaSellerOfTravel.validFrom,
);
const californiaSellerOfTravelExpires = formatLegalProfileDate(
  californiaSellerOfTravel.expires,
);
const companyContactSummary = getCompanyContactSummary();
const providerBoundarySummary = getProviderBoundarySummary();
const productScopeSummary = formatProductScope(legalProfile.productScope);

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
    slug: "privacy-choices",
    title: "Privacy Choices",
    summary: "Privacy and account choices currently available for Kurioticket users.",
    lastUpdated: legalNoticeLastUpdated,
    sections: [
      {
        id: "requests",
        title: "Privacy Requests",
        paragraphs: [
          `You can contact ${legalProfile.contact.privacyEmail} for privacy requests, account-data questions, and requests involving personal information handled by Kurioticket.`,
          "You may request access, correction, deletion, or ask questions about account or personal data. Kurioticket may need to verify your identity and may retain limited records where required for security, legal, fraud-prevention, dispute-resolution, or legitimate business purposes.",
        ],
      },
      {
        id: "account-alerts",
        title: "Account and Alert Choices",
        paragraphs: [
          "Where account settings are available, users can manage account details, saved travel features, alerts, and communication preferences.",
          `For email or alert preferences, use unsubscribe or preference-management links where provided, adjust available account settings, or contact ${legalProfile.contact.supportEmail} for help.`,
        ],
      },
      {
        id: "tracking-choices",
        title: "Ads and Analytics Choices",
        paragraphs: [
          `${legalProfile.company.legalName} does not currently use active ads or third-party analytics tracking tools.`,
          "If ads or third-party analytics tracking tools are added later, Kurioticket should update applicable policies and provide privacy choices where required by law.",
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
  {
    slug: "california-seller-of-travel-notice",
    title: "California Seller of Travel Notice",
    summary: "California Seller of Travel registration notice for Kurioticket’s travel search and redirect platform.",
    lastUpdated: legalNoticeLastUpdated,
    sections: [
      {
        id: "registration",
        title: "Registration Information",
        paragraphs: [
          `${legalProfile.company.legalName} is registered as a California Seller of Travel under Registration No. ${californiaSellerOfTravel.registrationNumber}.`,
          `Registration valid from ${californiaSellerOfTravelValidFrom}. Registration expires ${californiaSellerOfTravelExpires}.`,
          californiaSellerOfTravelNotice,
        ],
      },
      {
        id: "platform-model",
        title: "Search and Redirect Model",
        paragraphs: [
          `${legalProfile.company.legalName} operates a travel search, comparison, and redirect platform for ${productScopeSummary}. Kurioticket helps users compare travel options and continue to external providers for final booking steps.`,
          providerBoundarySummary,
        ],
      },
      {
        id: "provider-responsibilities",
        title: "External Provider Responsibilities",
        paragraphs: [
          "External providers handle final booking, payment, confirmation, cancellation, refunds, changes, baggage, check-in, and reservation support after you continue from Kurioticket to a provider site.",
          "Review the external provider’s final price, availability, fare rules, room or vehicle terms, cancellation policy, refund policy, baggage rules, check-in requirements, and customer support terms before completing any purchase.",
        ],
      },
      {
        id: "contact",
        title: "Contact",
        paragraphs: [
          companyContactSummary,
          `For platform support, contact ${legalProfile.contact.supportEmail}. For legal questions, contact ${legalProfile.contact.legalEmail}. For privacy questions, contact ${legalProfile.contact.privacyEmail}.`,
        ],
      },
    ],
  },
  {
    slug: "legal-notice-company-information",
    title: "Legal Notice & Company Information",
    summary: "Company, contact, product-scope, and provider-boundary information for Kurioticket.",
    lastUpdated: legalNoticeLastUpdated,
    sections: [
      {
        id: "company-information",
        title: "Company Information",
        paragraphs: [
          companyContactSummary,
          `Legal name: ${legalProfile.company.legalName}. Address: ${legalProfile.company.formattedAddress}. Business phone: ${legalProfile.contact.businessPhone}.`,
        ],
      },
      {
        id: "contacts",
        title: "Contact Emails",
        paragraphs: [
          `Support: ${legalProfile.contact.supportEmail}. Legal: ${legalProfile.contact.legalEmail}. Privacy: ${legalProfile.contact.privacyEmail}.`,
        ],
      },
      {
        id: "product-scope",
        title: "Product Scope and Business Model",
        paragraphs: [
          `Kurioticket’s product scope includes ${productScopeSummary}.`,
          `Business model: ${legalProfile.businessModel.platformDescription} Kurioticket helps users search, compare, and continue to external travel providers.`,
        ],
      },
      {
        id: "provider-payment-boundary",
        title: "Provider and Payment Boundary",
        paragraphs: [
          providerBoundarySummary,
          "The external provider that accepts payment is responsible for final booking terms, final price, payment processing, confirmation, cancellation, refunds, changes, baggage, check-in, and reservation support.",
        ],
      },
      {
        id: "california-registration",
        title: "California Seller of Travel Reference",
        paragraphs: [
          californiaSellerOfTravelNotice,
          `Registration valid from ${californiaSellerOfTravelValidFrom}. Registration expires ${californiaSellerOfTravelExpires}.`,
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
    slug: "security-statement",
    title: "Security Statement",
    summary: "High-level security practices and user responsibilities for Kurioticket accounts and provider redirects.",
    lastUpdated: legalNoticeLastUpdated,
    sections: [
      {
        id: "account-security",
        title: "Account Security",
        paragraphs: [
          "Kurioticket uses account authentication and session protections to help protect account access and platform features.",
          "Users should protect passwords, avoid reusing credentials across services, keep account contact information current, and contact support if they suspect unauthorized account access.",
        ],
      },
      {
        id: "provider-pages",
        title: "External Provider Pages",
        paragraphs: [
          "Before entering payment or traveler information after a redirect, verify that you are on the expected external provider page and review that provider’s terms, privacy policy, refund rules, and support process.",
          providerBoundarySummary,
        ],
      },
      {
        id: "support-boundaries",
        title: "Support Boundaries",
        paragraphs: [
          "Kurioticket support can help with platform access, account issues, saved travel tools, alerts, and provider-redirect questions.",
          "Kurioticket cannot override external provider account controls, payment systems, fare rules, booking confirmations, cancellations, refunds, changes, baggage, check-in, or reservation support decisions.",
        ],
      },
      {
        id: "reporting",
        title: "Report Security Concerns",
        paragraphs: [
          `Report security concerns, suspicious account activity, or platform safety issues to ${legalProfile.contact.legalEmail} or ${legalProfile.contact.supportEmail}.`,
        ],
      },
    ],
  },
  {
    slug: "accessibility-statement",
    title: "Accessibility Statement",
    summary: "Kurioticket’s accessibility commitment for travel search, account, and support experiences.",
    lastUpdated: legalNoticeLastUpdated,
    sections: [
      {
        id: "commitment",
        title: "Our Accessibility Aim",
        paragraphs: [
          "Kurioticket aims to provide accessible travel search, comparison, account, alert, and support experiences for users with different needs, devices, and assistive technologies.",
          "Accessibility work is part of ongoing product quality, design, engineering, and support review as Kurioticket grows.",
        ],
      },
      {
        id: "feedback",
        title: "Accessibility Feedback",
        paragraphs: [
          `If you experience an accessibility issue while using Kurioticket, contact ${legalProfile.contact.supportEmail} and include the page, feature, browser or device, assistive technology if relevant, and a description of the issue.`,
          `For legal accessibility questions, contact ${legalProfile.contact.legalEmail}.`,
        ],
      },
      {
        id: "external-providers",
        title: "External Provider Sites",
        paragraphs: [
          "External provider websites, booking flows, payment pages, mobile apps, and customer support channels are controlled by those providers and may follow their own accessibility practices.",
          "If an accessibility issue occurs after you leave Kurioticket, contact the external provider responsible for that page or booking flow.",
        ],
      },
    ],
  },
];

export const legalDeveloperNote = enTranslations["legal.privacy.developerNote"];
