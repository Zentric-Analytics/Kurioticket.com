import type { LegalDocument } from "@/lib/types";

const lastUpdated = "May 11, 2026";

export const legalDocuments: LegalDocument[] = [
  {
    slug: "terms-of-service",
    title: "Terms of Service",
    summary: "Rules for using Curioticket search, accounts, dashboards, premium tools, and partner redirects.",
    lastUpdated,
    sections: [
      {
        id: "overview",
        title: "Overview",
        paragraphs: [
          "Curioticket is an intelligent travel confidence platform that helps users search flights and hotels, compare partner prices, save travel options, create price alerts, and use premium optimization tools.",
          "Curioticket is not an airline, hotel, online travel agency, travel agency, payment processor for travel purchases, or ticket issuer. Purchases, fare rules, ticketing, itinerary changes, cancellations, refunds, boarding, check-in, and travel documents are handled by the external provider.",
        ],
      },
      {
        id: "accounts",
        title: "Accounts",
        paragraphs: [
          "You may search and view travel results without an account. An account is required for saved flights, saved hotels, saved searches, alerts, dashboards, support tickets, and premium features.",
          "You are responsible for safeguarding your login credentials and for activity under your account.",
        ],
      },
      {
        id: "acceptable-use",
        title: "Acceptable Use",
        paragraphs: [
          "You may not abuse search, payment, alert, support, or AI systems; reverse engineer provider integrations; attempt to bypass rate limits; or use Curioticket for fraudulent, unlawful, or harmful activity.",
          "We may suspend access if activity threatens platform reliability, provider relationships, payment security, or user safety.",
        ],
      },
      {
        id: "partner-services",
        title: "Partner Services",
        paragraphs: [
          "Travel results may include prices, availability, policies, route data, hotel data, and external provider links supplied by APIs, airlines, hotels, or affiliate partners.",
          "Partner terms apply once you leave Curioticket or complete a transaction with a partner. Review all fare, hotel, baggage, change, refund, visa, and traveler requirements before purchase.",
        ],
      },
    ],
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    summary: "How Curioticket collects, uses, stores, and protects account, search, alert, subscription, support, email, and AI feature data.",
    lastUpdated,
    sections: [
      {
        id: "data-we-collect",
        title: "Data We Collect",
        paragraphs: [
          "We collect account data such as name, email, hashed password, authentication provider identifiers, and optional travel preferences. We do not ask for passport data, government ID, or home address at signup.",
          "We collect product data such as searches, saved flights, saved hotels, saved searches, price alerts, redirects, support tickets, notifications, analytics events, subscription status, and feature usage.",
        ],
      },
      {
        id: "vendors",
        title: "Service Providers",
        paragraphs: [
          "We use PostgreSQL and Prisma for application data, Stripe for subscriptions and billing, Resend for transactional email, OpenAI for premium AI analysis, and travel API providers for search results.",
          "Curioticket does not store credit card numbers. Stripe processes subscription payment details. Curioticket does not store passport data.",
        ],
      },
      {
        id: "ai-data",
        title: "AI Features",
        paragraphs: [
          "Premium AI features use search and travel context to explain options, compare tradeoffs, and reduce decision stress. AI outputs are informational and must not be treated as guarantees.",
          "AI systems are instructed not to invent prices, availability, baggage rules, airline policies, hotel policies, or guaranteed savings.",
        ],
      },
      {
        id: "choices",
        title: "Your Choices",
        paragraphs: [
          "You may update notification preferences, request account deletion, and request access or correction where required by applicable privacy laws.",
          "We retain only data that is useful for product operation, security, support, analytics, compliance, or legitimate business needs.",
        ],
      },
    ],
  },
  {
    slug: "cookie-policy",
    title: "Cookie Policy",
    summary: "How Curioticket uses cookies and similar technologies for authentication, security, preferences, analytics, and performance.",
    lastUpdated,
    sections: [
      {
        id: "use",
        title: "How Cookies Are Used",
        paragraphs: [
          "Curioticket may use cookies for authentication sessions, security, fraud prevention, preference storage, analytics, performance monitoring, and feature experiments.",
          "Some cookies are necessary for login, dashboard access, subscriptions, support tickets, and saved travel features.",
        ],
      },
      {
        id: "third-parties",
        title: "Third-Party Technologies",
        paragraphs: [
          "Stripe, authentication providers, analytics tools, and hosting infrastructure may set or read cookies as needed to provide secure services.",
          "External provider sites have their own cookie practices after redirect.",
        ],
      },
      {
        id: "controls",
        title: "Controls",
        paragraphs: [
          "You can control cookies through your browser settings. Blocking necessary cookies may prevent login, subscriptions, dashboards, saved items, and support tools from working correctly.",
        ],
      },
    ],
  },
  {
    slug: "affiliate-disclosure",
    title: "Affiliate Disclosure",
    summary: "How Curioticket may earn commissions when users click or book through trusted partners.",
    lastUpdated,
    sections: [
      {
        id: "model",
        title: "Affiliate Model",
        paragraphs: [
          "Curioticket offers free flight and hotel search without service fees. We may earn affiliate commissions when users click, book, or purchase through airline, hotel, or travel partner links.",
          "Affiliate compensation helps fund free search, alerts, support, platform development, and premium optimization features.",
        ],
      },
      {
        id: "ranking",
        title: "Ranking Integrity",
        paragraphs: [
          "Curioticket aims to rank results by user value signals such as price, duration, stops, confidence, comfort, and stress reduction. Affiliate relationships should not create fake urgency, hidden fees, or misleading recommendations.",
        ],
      },
    ],
  },
  {
    slug: "refund-booking-disclaimer",
    title: "Refund & External Provider Disclaimer",
    summary: "Clarifies that purchases, ticketing, refunds, cancellations, and payment for travel inventory happen outside Curioticket.",
    lastUpdated,
    sections: [
      {
        id: "no-ticketing",
        title: "No Direct Ticket Issuing",
        paragraphs: [
          "Curioticket does not sell airline tickets or hotel reservations. We redirect users to external airlines, hotels, affiliate partners, or travel providers to continue comparison and purchase steps.",
          "Your purchase contract is with the external provider that accepts your payment, not Curioticket.",
        ],
      },
      {
        id: "refunds",
        title: "Refunds and Changes",
        paragraphs: [
          "Refunds, credits, schedule changes, cancellations, missed connections, check-in issues, baggage disputes, and purchase problems are handled by the external airline, hotel, or travel provider.",
          "Curioticket support can help you understand platform usage and travel guidance boundaries, but cannot override partner or airline policies.",
        ],
      },
    ],
  },
  {
    slug: "subscription-terms",
    title: "Subscription Terms",
    summary: "Terms for the Curioticket Premium membership, trial, billing, cancellation, invoices, and access.",
    lastUpdated,
    sections: [
      {
        id: "pricing",
        title: "Premium Pricing",
        paragraphs: [
          "Curioticket Premium is available for $9.99 per month or $79 per year, with a 7-day free trial when eligible. Taxes may apply.",
          "Premium is an intelligent travel optimization membership. It is not required to search flights, search hotels, view results, view details, or redirect to partners.",
        ],
      },
      {
        id: "billing",
        title: "Billing and Cancellation",
        paragraphs: [
          "Stripe manages checkout, subscriptions, invoices, payment methods, webhooks, and billing portal access. Curioticket does not store card numbers.",
          "Unless canceled, subscriptions renew automatically at the selected interval. You may manage or cancel billing through the Stripe billing portal.",
        ],
      },
      {
        id: "premium-features",
        title: "Premium Features",
        paragraphs: [
          "Premium includes AI Travel Concierge, smart route optimization, unlimited alerts, advanced tracking, personalized recommendations, risk insights, destination intelligence, savings reports, and priority support as available.",
          "Premium insights are informational and cannot guarantee savings, availability, risk elimination, or a particular travel outcome.",
        ],
      },
    ],
  },
  {
    slug: "acceptable-use-policy",
    title: "Acceptable Use Policy",
    summary: "Behavior rules for safe, fair, lawful use of Curioticket systems.",
    lastUpdated,
    sections: [
      {
        id: "prohibited",
        title: "Prohibited Conduct",
        paragraphs: [
          "You may not scrape Curioticket, scrape airline websites through Curioticket, attack provider APIs, automate abusive searches, create fraudulent accounts, test stolen cards, spam support, or interfere with platform reliability.",
          "You may not use Curioticket to facilitate unlawful travel activity, harassment, fraud, abuse, or unauthorized access.",
        ],
      },
      {
        id: "enforcement",
        title: "Enforcement",
        paragraphs: [
          "We may throttle, suspend, remove, or block access when needed to protect users, partners, providers, payment systems, and platform operations.",
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
          "You may request account deletion from account settings or support. We will process deletion requests consistent with applicable law, identity verification needs, fraud prevention, billing obligations, and security requirements.",
        ],
      },
      {
        id: "retention",
        title: "Retained Records",
        paragraphs: [
          "Some records may be retained for legitimate business, security, analytics, tax, subscription, legal, abuse prevention, or dispute-resolution purposes. We minimize retained personal data where practical.",
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
          "Flight and hotel prices, taxes, fees, baggage rules, cabin availability, rooms, schedules, and policies can change quickly and may differ by the time you reach a partner checkout page.",
          "Curioticket aims to compare current provider data, but provider delays, rate limits, cache windows, currency conversion, partner rules, and user selections can affect displayed information.",
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
    summary: "What happens when Curioticket redirects users to airlines, hotels, affiliate partners, or travel providers.",
    lastUpdated,
    sections: [
      {
        id: "redirect",
        title: "Secure Redirects",
        paragraphs: [
          "When you continue to an external provider, Curioticket redirects you to an airline, hotel, affiliate partner, or travel provider. We may log redirect metadata such as provider, route, price, timestamp, user type, and source page for analytics, support, abuse prevention, and affiliate tracking.",
          "Curioticket does not auto-fill airline websites, scrape airline websites, or complete partner purchases on your behalf.",
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
  "These legal drafts are startup placeholders and should be reviewed by qualified legal counsel before large-scale public launch.";
