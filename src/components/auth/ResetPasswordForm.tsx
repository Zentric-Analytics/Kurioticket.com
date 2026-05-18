"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export function ResetPasswordForm({ token }: { token: string }) {
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(formData: FormData) {
    setLoading(true); setError(""); setSuccess("");
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    if (password !== confirmPassword) { setLoading(false); setError("Passwords do not match."); return; }
    const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password, confirmPassword }) });
    const data = await response.json(); setLoading(false);
    if (!response.ok) { setError(String(data.error || "Invalid or expired reset link.")); return; }
    setSuccess("Password updated successfully. Redirecting to login...");
    window.setTimeout(() => { window.location.href = "/auth/signin"; }, 1100);
  }
  return <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8"><h1 className="text-3xl font-bold text-slate-900">Create new password</h1><p className="mt-2 text-sm text-slate-600">Choose a secure password with at least 8 characters, letters, and numbers.</p><form action={submit} className="mt-6 grid gap-4"><Field label="New password"><Input name="password" type={show ? "text" : "password"} autoComplete="new-password" minLength={8} required className="h-12 rounded-xl border-slate-300" /></Field><Field label="Confirm password"><Input name="confirmPassword" type={show ? "text" : "password"} autoComplete="new-password" minLength={8} required className="h-12 rounded-xl border-slate-300" /></Field><button type="button" className="justify-self-start text-sm font-medium text-cyan-700" onClick={() => setShow((v) => !v)}>{show ? "Hide passwords" : "Show passwords"}</button>{error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}{success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}<Button disabled={loading} className="h-12 rounded-xl bg-slate-900 hover:bg-slate-800">{loading ? "Updating..." : "Update password"}</Button></form></div>;
}
