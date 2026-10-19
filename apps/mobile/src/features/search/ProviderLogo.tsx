import { AirlineLogo } from "./AirlineLogo";

export function ProviderLogo({
  provider,
  logoUrl,
  variant = "default",
}: {
  provider: string;
  logoUrl?: string | null;
  variant?: "default" | "deal-card" | "deal-card-compact";
}) {
  return (
    <AirlineLogo
      airlineName={provider}
      logoUrl={logoUrl}
      fallbackCharacters={1}
      variant={variant === "deal-card" ? "provider-deal" : variant === "deal-card-compact" ? "provider-deal-compact" : "default"}
    />
  );
}
