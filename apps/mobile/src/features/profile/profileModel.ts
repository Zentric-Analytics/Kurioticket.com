import type { FlowIconName } from "../flow/FlowIcon";
import type { MobileTranslationKey } from "../../localization/mobileLocalizationCatalog";

export type ProfileNativeHref = "/personal-information" | "/security" | "/price-alerts" | "/settings" | "/saved" | "/recent" | "/faq" | "/support" | "/email-preferences" | "/travel-preferences" | "/(tabs)/profile/terms-of-service" | "/(tabs)/profile/privacy-policy";
export type ProfileDestination =
  | { kind: "native"; href: ProfileNativeHref }
  | { kind: "preview-browser"; path: "/terms" | "/privacy"; productionHref: "/(tabs)/profile/terms-of-service" | "/(tabs)/profile/privacy-policy" };
export type ProfileItem = { label: MobileTranslationKey; icon: FlowIconName; destination: ProfileDestination };
export type ProfileSection = { title: MobileTranslationKey; items: ProfileItem[] };

export function profileFirstName(name?: string | null): string | null {
  const normalized = name?.trim();
  if (!normalized || normalized.includes("@")) return null;
  return normalized.split(/\s+/).filter(Boolean)[0] || null;
}

export const authenticatedProfileSections: ProfileSection[] = [
  { title: "manageAccount", items: [
    { label: "personalDetails", icon: "person", destination: { kind: "native", href: "/personal-information" } },
    { label: "securitySettings", icon: "shield", destination: { kind: "native", href: "/security" } },
  ] },
  { title: "travelActivity", items: [
    { label: "savedItems", icon: "heart", destination: { kind: "native", href: "/saved" } },
    { label: "recentSearches", icon: "clock", destination: { kind: "native", href: "/recent" } },
    { label: "priceAlerts", icon: "bell", destination: { kind: "native", href: "/price-alerts" } },
  ] },
  { title: "preferences", items: [
    { label: "customizationPreferences", icon: "sliders", destination: { kind: "native", href: "/settings" } },
    { label: "travelPreferences", icon: "flight", destination: { kind: "native", href: "/travel-preferences" } },
    { label: "emailPreferences", icon: "mail", destination: { kind: "native", href: "/email-preferences" } },
  ] },
  { title: "helpSupport", items: [
    { label: "contactSupport", icon: "headset", destination: { kind: "native", href: "/support" } },
    { label: "faq", icon: "help", destination: { kind: "native", href: "/faq" } },
  ] },
  { title: "aboutLegal", items: [
    { label: "terms", icon: "document", destination: { kind: "preview-browser", path: "/terms", productionHref: "/(tabs)/profile/terms-of-service" } },
    { label: "privacy", icon: "shield", destination: { kind: "preview-browser", path: "/privacy", productionHref: "/(tabs)/profile/privacy-policy" } },
  ] },
];
