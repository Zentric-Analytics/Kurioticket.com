import { AirlineLogo } from "./AirlineLogo";
import { resolveProviderLogo } from "./providerLogoResolver";

export function ProviderLogo({
  provider,
  logoUrl,
}: {
  provider: string;
  logoUrl?: string | null;
}) {
  return (
    <AirlineLogo
      airlineName={provider}
      logoUrl={logoUrl ?? resolveProviderLogo(provider)}
      fallbackCharacters={1}
    />
  );
}
