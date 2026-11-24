"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Carry only an IANA viewer timezone; never use client time as an auth or audit source. */
export function AdminSearchTimeZoneSync() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    if (params.get("viewerTimeZone") === zone) return;
    const next = new URLSearchParams(params.toString());
    next.set("viewerTimeZone", zone);
    router.replace(pathname + "?" + next.toString(), { scroll: false });
  }, [pathname, params, router]);
  return null;
}
