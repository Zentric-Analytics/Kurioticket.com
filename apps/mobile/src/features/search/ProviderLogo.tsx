import { AirlineLogo } from "./AirlineLogo";

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
      logoUrl={logoUrl}
      fallbackCharacters={1}
    />
  );
}
