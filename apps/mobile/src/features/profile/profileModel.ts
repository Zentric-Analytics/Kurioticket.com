import type { FlowIconName } from "../flow/FlowIcon";
import type { MobileTranslationKey } from "../../localization/mobileLocalization";

export type ProfileDestination =
  | { kind: "native"; href: "/personal-information" | "/price-alerts" | "/settings" | "/saved" | "/(tabs)/trips" }
  | { kind: "external"; href: string };
export type ProfileItem = { label: MobileTranslationKey; icon: FlowIconName; destination: ProfileDestination };
export type ProfileSection = { title: MobileTranslationKey; items: ProfileItem[] };

export const authenticatedProfileSections: ProfileSection[] = [
  { title: "manageAccount", items: [
    { label: "personalDetails", icon: "person", destination: { kind: "native", href: "/personal-information" } },
    { label: "securitySettings", icon: "shield", destination: { kind: "external", href: "https://kurioticket.com/dashboard/security" } },
  ] },
  { title: "travelActivity", items: [
    { label: "myTrips", icon: "briefcase", destination: { kind: "native", href: "/(tabs)/trips" } },
    { label: "savedRecent", icon: "bookmark", destination: { kind: "native", href: "/saved" } },
    { label: "priceAlerts", icon: "bell", destination: { kind: "native", href: "/price-alerts" } },
  ] },
  { title: "preferences", items: [
    { label: "emailPreferences", icon: "mail", destination: { kind: "external", href: "https://kurioticket.com/dashboard/preferences/email" } },
    { label: "customizationPreferences", icon: "palette", destination: { kind: "native", href: "/settings" } },
    { label: "travelPreferences", icon: "settings", destination: { kind: "external", href: "https://kurioticket.com/dashboard/preferences/travel" } },
  ] },
  { title: "helpSupport", items: [
    { label: "contactSupport", icon: "headset", destination: { kind: "external", href: "https://kurioticket.com/support" } },
    { label: "faq", icon: "help", destination: { kind: "external", href: "https://kurioticket.com/faq" } },
  ] },
];
