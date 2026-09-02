import type { FlowIconName } from "../flow/FlowIcon";
import type { MobileTranslationKey } from "../../localization/mobileLocalizationCatalog";

export type ProfileDestination =
  | { kind: "native"; href: "/personal-information" | "/security" | "/price-alerts" | "/settings" | "/saved" | "/recent" | "/faq" | "/support" | "/email-preferences" | "/travel-preferences" }
  | { kind: "external"; href: "/terms" | "/privacy" };
export type ProfileItem = { label: MobileTranslationKey; icon: FlowIconName; destination: ProfileDestination };
export type ProfileSection = { title: MobileTranslationKey; items: ProfileItem[] };

export function profileFirstName(name?: string | null, email?: string | null): string | null {
  const normalized = name?.trim();
  if (!normalized || normalized.includes("@")) return null;
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (!tokens.length) return null;

  const emailLocal = email?.trim().toLowerCase().split("@")[0] || "";
  const emailTokens = emailLocal.split(/[._+-]+/).filter(Boolean);
  for (const emailToken of emailTokens) {
    const matched = tokens.find(token => token.toLowerCase() === emailToken);
    if (matched) return matched;
  }
  return tokens[0] || null;
}

export const authenticatedProfileSections: ProfileSection[] = [
  { title: "manageAccount", items: [
    { label: "personalDetails", icon: "person", destination: { kind: "native", href: "/personal-information" } },
    { label: "securitySettings", icon: "shield", destination: { kind: "native", href: "/security" } },
  ] },
  { title: "travelActivity", items: [
    { label: "savedItems", icon: "bookmark", destination: { kind: "native", href: "/saved" } },
    { label: "recentSearches", icon: "clock", destination: { kind: "native", href: "/recent" } },
    { label: "priceAlerts", icon: "bell", destination: { kind: "native", href: "/price-alerts" } },
  ] },
  { title: "preferences", items: [
    { label: "customizationPreferences", icon: "palette", destination: { kind: "native", href: "/settings" } },
    { label: "travelPreferences", icon: "settings", destination: { kind: "native", href: "/travel-preferences" } },
    { label: "emailPreferences", icon: "mail", destination: { kind: "native", href: "/email-preferences" } },
  ] },
  { title: "helpSupport", items: [
    { label: "contactSupport", icon: "headset", destination: { kind: "native", href: "/support" } },
    { label: "faq", icon: "help", destination: { kind: "native", href: "/faq" } },
  ] },
  { title: "aboutLegal", items: [
    { label: "terms", icon: "document", destination: { kind: "external", href: "/terms" } },
    { label: "privacy", icon: "shield", destination: { kind: "external", href: "/privacy" } },
  ] },
];
