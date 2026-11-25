/** Shared presentation copy for the website and native apps.
 * This module contains no identity, storage or consent side effects.
 */
export const cookiePolicyPath = "/legal/cookie-policy";
export const cookiePolicyFromPreferencesHref = cookiePolicyPath + "?view=consent";
export function isCookiePolicyFromPreferences(pathname: string | null, search: string): boolean {
  return pathname === cookiePolicyPath && new URLSearchParams(search).get("view") === "consent";
}

export const cookieConsentCopy = {
  banner: "We use cookies and similar technologies to keep Kurioticket secure and functional. With your permission, analytics helps us understand and improve your experience. Manage your preferences at any time.",
  details: "We use cookies and similar technologies to remember your preferences and support our services. With your consent, analytics helps us understand how you use Kurioticket across visits. Accept all enables available optional technologies only.",
  optOut: "To decline optional analytics, switch it off and save your preferences.",
  webManage: "Change or withdraw your choice at any time in the website footer.",
  nativeManage: "Change or withdraw your choice at any time under Profile → About & legal.",
  essential: {
    subtitle: "Keeps Kurioticket secure and functional",
    description: "Supports security, sign-in, requested searches and necessary provider handoff records. Essential functions do not enable optional analytics.",
  },
  analytics: {
    subtitle: "Helps us understand your experience",
    suggested: "Suggested on · awaiting your choice",
    description: "With your permission, we measure usage and travel activity across visits, including account-linked activity when signed in. Turning analytics off does not prevent requested searches or necessary records.",
  },
  performance: {
    subtitle: "Helps measure speed and reliability",
    description: "Optional performance measurement helps assess loading times and reliability. Not available yet and not enabled by Accept all. Essential service diagnostics are separate.",
  },
  marketing: {
    subtitle: "Helps measure campaigns and relevant promotions",
    description: "Optional marketing measurement could help assess campaigns and personalize promotions. Not available yet and not enabled by Accept all.",
  },
} as const;
