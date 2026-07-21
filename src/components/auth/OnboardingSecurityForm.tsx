"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { decodeRegistrationOptions, defaultPasskeyName, passkeysSupported, serializeRegistrationCredential } from "@/lib/passkey-client";

export function OnboardingSecurityForm() {
  const [supported, setSupported] = useState(true);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const continueToApp = () => { window.location.href = "/"; };

  async function setupPasskey() {
    if (!passkeysSupported()) { setSupported(false); setStatus("This browser or device does not appear to support passkeys. You can continue now and add a passkey later from Security Settings."); return; }
    setBusy(true); setStatus("");
    try {
      const optionsResponse = await fetch("/api/account/security/passkeys/register/options", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context: "onboarding" }) });
      const optionsData = await optionsResponse.json().catch(() => ({}));
      if (!optionsResponse.ok) throw new Error(optionsData.error || "Unable to start passkey setup.");
      const credential = await navigator.credentials.create({ publicKey: decodeRegistrationOptions(optionsData.options) }) as PublicKeyCredential | null;
      if (!credential) throw new Error("Passkey setup was cancelled.");
      const suggestedName = defaultPasskeyName();
      const name = window.prompt("Name this passkey", suggestedName) || suggestedName;
      const verifyResponse = await fetch("/api/account/security/passkeys/register/verify", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(serializeRegistrationCredential(credential, name)) });
      const verifyData = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok) throw new Error(verifyData.error || "Unable to verify passkey setup.");
      setDone(true); setStatus("Passkey added. You can now use this device, password manager, or security key to sign in to Kurioticket.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to set up passkey."); }
    finally { setBusy(false); }
  }

  return <main className="page-shell flex-1 pt-24 pb-8 sm:pt-28 lg:pt-28"><Card className="mx-auto w-full max-w-xl p-6">
    <p className="text-sm font-semibold uppercase tracking-wide text-teal-dark">Account security</p>
    <h1 className="mt-2 text-2xl font-bold text-navy">Secure your Kurioticket account with a passkey</h1>
    <p className="mt-3 text-sm leading-6 text-muted">Passkeys let you sign in faster and more securely using Face ID, fingerprint, Windows Hello, your device screen lock, password manager, or security key.</p>
    <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">Kurioticket never receives your fingerprint, face, device PIN, or private key.</p>
    {!supported ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">This browser or device does not appear to support passkeys. You can continue now and add a passkey later from Security Settings.</p> : null}
    {status ? <p role="status" className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">{status}</p> : null}
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      {done ? <Button type="button" onClick={continueToApp}>Continue</Button> : <Button type="button" disabled={busy || !supported} onClick={() => void setupPasskey()}>{busy ? "Opening passkey prompt…" : "Set up passkey"}</Button>}
      <Button type="button" variant="secondary" onClick={continueToApp}>{done ? "Done" : "Skip for now"}</Button>
    </div>
  </Card></main>;
}
