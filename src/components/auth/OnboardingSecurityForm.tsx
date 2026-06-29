"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function OnboardingSecurityForm() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function setupPasskey() {
    if (!window.PublicKeyCredential || !navigator.credentials) {
      setStatus("This browser or device does not support passkeys yet. You can add one later from Security Settings.");
      return;
    }
    setBusy(true);
    setStatus("Opening your device security prompt…");
    try {
      const optionsResponse = await fetch("/api/account/security/passkeys/register/options", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context: "onboarding" }) });
      const optionsData = await optionsResponse.json();
      if (!optionsResponse.ok) throw new Error(optionsData.error || "Unable to start passkey setup.");
      const credential = await navigator.credentials.create({ publicKey: decodeCreationOptions(optionsData.options) }) as PublicKeyCredential | null;
      if (!credential) throw new Error("Passkey setup was cancelled.");
      const name = window.prompt("Name this passkey", defaultPasskeyName()) || defaultPasskeyName();
      const verifyResponse = await fetch("/api/account/security/passkeys/register/verify", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...serializeCreatedCredential(credential), name }) });
      const verifyData = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok) throw new Error(verifyData.error || "Unable to save passkey.");
      setStatus("Passkey added. Continuing to your dashboard…");
      window.setTimeout(() => { window.location.href = "/dashboard"; }, 700);
    } catch (error) {
      setStatus(error instanceof Error ? `${error.message} You can continue and add a passkey later from Security Settings.` : "Unable to add passkey. You can continue and add one later.");
    } finally {
      setBusy(false);
    }
  }

  return <Card className="mx-auto w-full max-w-xl p-6">
    <p className="text-sm font-semibold uppercase tracking-wide text-teal-dark">Account security</p>
    <h1 className="mt-2 text-2xl font-bold text-navy">Secure your Kurioticket account with a passkey</h1>
    <p className="mt-3 text-sm leading-6 text-muted">Passkeys let you sign in faster and more securely using Face ID, fingerprint, Windows Hello, your phone screen lock, password manager, or security key.</p>
    <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">Kurioticket never receives your fingerprint, face, device PIN, or private key.</p>
    {status ? <p className="mt-4 text-sm font-semibold text-teal-dark" aria-live="polite">{status}</p> : null}
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <Button type="button" onClick={setupPasskey} disabled={busy}>{busy ? "Setting up…" : "Set up passkey"}</Button>
      <Button type="button" variant="secondary" onClick={() => { window.location.href = "/dashboard"; }} disabled={busy}>Skip for now</Button>
    </div>
  </Card>;
}
function defaultPasskeyName() { const ua = navigator.userAgent; if (/iPhone/.test(ua)) return "iPhone"; if (/Windows/.test(ua)) return "Windows Hello"; if (/Mac/.test(ua)) return "MacBook"; return "Passkey"; }
function toBase64url(buffer: ArrayBuffer) { const bytes = new Uint8Array(buffer); let binary = ""; bytes.forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function fromBase64url(value: string) { const normalized = value.replace(/-/g, "+").replace(/_/g, "/"); const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="); return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)).buffer; }
function decodeCreationOptions(options: PublicKeyCredentialCreationOptions & { challenge: string; user: PublicKeyCredentialUserEntity & { id: string }; excludeCredentials?: Array<PublicKeyCredentialDescriptor & { id: string }> }) { return { ...options, challenge: fromBase64url(options.challenge), user: { ...options.user, id: fromBase64url(options.user.id) }, excludeCredentials: options.excludeCredentials?.map((credential) => ({ ...credential, id: fromBase64url(String(credential.id)) })) }; }
function serializeCreatedCredential(credential: PublicKeyCredential) { const response = credential.response as AuthenticatorAttestationResponse; return { id: credential.id, rawId: toBase64url(credential.rawId), type: credential.type, response: { attestationObject: toBase64url(response.attestationObject), clientDataJSON: toBase64url(response.clientDataJSON), transports: response.getTransports?.() || [], authenticatorData: toBase64url(response.getAuthenticatorData()) }, authenticatorAttachment: credential.authenticatorAttachment }; }
