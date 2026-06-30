"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function OnboardingSecurityForm() {
  return <Card className="mx-auto w-full max-w-xl p-6">
    <p className="text-sm font-semibold uppercase tracking-wide text-teal-dark">Account security</p>
    <h1 className="mt-2 text-2xl font-bold text-navy">Passkey setup is coming soon</h1>
    <p className="mt-3 text-sm leading-6 text-muted">Passkey setup is being finalized so account verification can continue directly into your device security prompt.</p>
    <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">You can use password or Google sign-in for now. We’ll make passkey setup available again from Security Settings when it is ready.</p>
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <Button type="button" disabled>Passkeys coming soon</Button>
      <Button type="button" variant="secondary" onClick={() => { window.location.href = "/"; }}>Continue</Button>
    </div>
  </Card>;
}
