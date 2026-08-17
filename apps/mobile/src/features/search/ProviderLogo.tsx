import { AirlineLogo } from "./AirlineLogo";
import { resolveProviderLogo } from "./providerLogoResolver";

export function ProviderLogo({ provider }: { provider: string }) {
  return (
    <AirlineLogo
      airlineName={provider}
      logoUrl={resolveProviderLogo(provider)}
      fallbackCharacters={1}
    />
  );
}
