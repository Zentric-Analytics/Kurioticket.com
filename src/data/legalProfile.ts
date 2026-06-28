export type TravelProduct = "flights" | "hotels" | "cars" | "deals";

export type LoginProvider = "credentials" | "google";

export type LegalProfile = {
  company: {
    legalName: string;
    formattedAddress: string;
    address: {
      street: string;
      suite: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  contact: {
    businessPhone: string;
    supportEmail: string;
    legalEmail: string;
    privacyEmail: string;
  };
  productScope: TravelProduct[];
  businessModel: {
    platformDescription: string;
    usersCanSearchWithoutAccount: boolean;
    accountsAreOptional: boolean;
    finalTravelPaymentsProcessedByKurioticket: boolean;
  };
  accountModel: {
    requiredSignupFields: string[];
    optionalProfileFields: string[];
    accountFeatures: string[];
    supportedLoginProviders: LoginProvider[];
    countryFieldSupported: boolean;
  };
  monetization: {
    mayEarnAffiliateOrApiPartnerCommissions: boolean;
    adsOrSponsoredPlacementsPlannedForLater: boolean;
  };
  providerAndPaymentBoundary: {
    externalProvidersHandleFinalBooking: boolean;
    kurioticketIssuesTravelDocuments: boolean;
    notIssuedByKurioticket: string[];
  };
  supportBoundary: {
    externalProvidersHandle: string[];
  };
  californiaSellerOfTravel: {
    registeredLegalName: string;
    registrationNumber: string;
    validFrom: string;
    expires: string;
    publicNotice: string;
  };
  attorneyReview: {
    // Internal-only flags. Do not surface these values in public UI without legal approval.
    tcrfVerificationRequired: boolean;
    legalDocumentsExpansionRequired: boolean;
  };
  tracking: {
    activeAnalytics: boolean;
    activeAds: boolean;
  };
  priceAlerts: {
    launchFeature: boolean;
    informationalOnly: boolean;
  };
};

export const legalProfile = {
  company: {
    legalName: "Kurioticket LLC",
    formattedAddress:
      "801 Tupper St, Suite 812, Santa Rosa, CA 95404",
    address: {
      street: "801 Tupper St",
      suite: "Suite 812",
      city: "Santa Rosa",
      state: "CA",
      postalCode: "95404",
      country: "United States",
    },
  },
  contact: {
    businessPhone: "346-383-0325",
    supportEmail: "support@kurioticket.com",
    legalEmail: "legal@kurioticket.com",
    privacyEmail: "privacy@kurioticket.com",
  },
  productScope: ["flights", "hotels", "cars", "deals"],
  businessModel: {
    platformDescription:
      "Travel search, comparison, and redirect platform.",
    usersCanSearchWithoutAccount: true,
    accountsAreOptional: true,
    finalTravelPaymentsProcessedByKurioticket: false,
  },
  accountModel: {
    requiredSignupFields: ["full name", "email address", "password"],
    optionalProfileFields: [
      "date of birth",
      "phone number",
      "nationality",
      "address",
      "profile photo",
    ],
    accountFeatures: [
      "saved trips",
      "dashboard access",
      "account support",
      "price alerts",
    ],
    supportedLoginProviders: ["credentials", "google"],
    countryFieldSupported: false,
  },
  monetization: {
    mayEarnAffiliateOrApiPartnerCommissions: true,
    adsOrSponsoredPlacementsPlannedForLater: true,
  },
  providerAndPaymentBoundary: {
    externalProvidersHandleFinalBooking: true,
    kurioticketIssuesTravelDocuments: false,
    notIssuedByKurioticket: [
      "tickets",
      "hotel reservations",
      "car rental confirmations",
      "vouchers",
      "final itineraries",
      "final booking receipts",
    ],
  },
  supportBoundary: {
    externalProvidersHandle: [
      "final booking",
      "payment",
      "confirmation",
      "cancellation",
      "refunds",
      "changes",
      "baggage",
      "check-in",
      "reservation support",
    ],
  },
  californiaSellerOfTravel: {
    registeredLegalName: "Kurioticket LLC",
    registrationNumber: "2172630-70",
    validFrom: "2026-06-06",
    expires: "2027-06-05",
    publicNotice:
      "Registration as a seller of travel does not constitute approval by the State of California.",
  },
  attorneyReview: {
    tcrfVerificationRequired: true,
    legalDocumentsExpansionRequired: true,
  },
  tracking: {
    activeAnalytics: false,
    activeAds: false,
  },
  priceAlerts: {
    launchFeature: true,
    informationalOnly: true,
  },
} satisfies LegalProfile;

export function getCaliforniaSellerOfTravelNotice() {
  const registration = legalProfile.californiaSellerOfTravel;

  return `California Seller of Travel Registration No. ${registration.registrationNumber}. ${registration.publicNotice}`;
}

export function getCompanyContactSummary() {
  const { company, contact } = legalProfile;

  return `${company.legalName}, ${company.formattedAddress}. Phone: ${contact.businessPhone}. Support: ${contact.supportEmail}. Legal: ${contact.legalEmail}. Privacy: ${contact.privacyEmail}.`;
}

export function getProviderBoundarySummary() {
  return "Kurioticket does not process final travel payments or issue final travel documents; external providers handle final booking, payment, confirmation, cancellation, refunds, changes, baggage, check-in, and reservation support.";
}
