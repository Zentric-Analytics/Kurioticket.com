"use client";

import Image from "next/image";
import { Plane } from "lucide-react";
import { useState } from "react";

export function FlightIdentityMarkContent({ logoUrl, logoFailed, decorative, mobile = false, onLogoError }: {
  logoUrl?: string | null;
  logoFailed: boolean;
  decorative: boolean;
  mobile?: boolean;
  onLogoError?: () => void;
}) {
  const hasLogo = Boolean(logoUrl && !logoFailed);
  return (
    <span data-flight-identity-mark={hasLogo ? "logo" : "fallback"} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#075EE8]" aria-hidden={decorative || undefined}>
      {hasLogo ? <Image src={logoUrl!} alt="" width={mobile ? 28 : 24} height={mobile ? 28 : 24} className={`${mobile ? "h-7 w-7" : "h-6 w-6"} object-contain`} onError={onLogoError} /> : <Plane className="h-4 w-4 rotate-45" aria-hidden="true" />}
    </span>
  );
}

function FlightIdentityMarkState({ logoUrl, decorative, mobile }: { logoUrl?: string | null; decorative: boolean; mobile: boolean }) {
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <FlightIdentityMarkContent
      logoUrl={logoUrl}
      logoFailed={logoFailed}
      decorative={decorative}
      mobile={mobile}
      onLogoError={() => setLogoFailed(true)}
    />
  );
}

export function FlightIdentityMark({ logoUrl, label, decorative = false, mobile = false }: { logoUrl?: string | null; label?: string; decorative?: boolean; mobile?: boolean }) {
  return (
    <span className="shrink-0" aria-label={!decorative ? label : undefined}>
      <FlightIdentityMarkState key={logoUrl ?? "__no-logo__"} logoUrl={logoUrl} decorative={decorative} mobile={mobile} />
    </span>
  );
}
