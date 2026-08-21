export const featureControlRegistry = {
  FLIGHT_SEARCH_ENABLED: control("Flight Search", "Emergency control for flight provider search. Saved travel data is unaffected.", "Travel Search", "Critical", true, "product"),
  HOTEL_SEARCH_ENABLED: control("Hotel Search", "Controls hotel search without affecting flights or cars.", "Travel Search", "High", true, "product"),
  CAR_SEARCH_ENABLED: control("Car Search", "Controls car search without affecting flights or hotels.", "Travel Search", "High", true, "product"),
  DEALS_ENABLED: control("Deals", "Controls Deals entry points; underlying search products retain their own controls.", "Travel Search", "Medium", true, "product"),
  PRICE_ALERTS_ENABLED: control("Price Alerts", "Controls automatic and target alert creation and reactivation; existing alerts and history remain available.", "Travel Automation", "High", true, "product"),
  PRICE_ALERT_PROCESSING_ENABLED: control("Price Alert Processing", "Pauses automatic price checks, events and email while preserving alert state.", "Travel Automation", "Critical", false, "processor"),
} as const;

function control(name: string, description: string, category: "Travel Search" | "Travel Automation", risk: "Critical" | "High" | "Medium", clientExposed: boolean, kind: "product" | "processor") {
  return { name, description, category, risk, defaultStaging: true, defaultProduction: true, clientExposed, productionReasonRequired: true, kind } as const;
}

export type FeatureControlKey = keyof typeof featureControlRegistry;
export type FeatureControlEnvironment = "STAGING" | "PRODUCTION";
export const featureControlKeys = Object.freeze(Object.keys(featureControlRegistry) as FeatureControlKey[]);
export function isFeatureControlKey(value: unknown): value is FeatureControlKey { return typeof value === "string" && Object.hasOwn(featureControlRegistry, value); }
export function isFeatureControlEnvironment(value: unknown): value is FeatureControlEnvironment { return value === "STAGING" || value === "PRODUCTION"; }
