"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(formData: FormData) {
    setLoading(true);
    await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: String(formData.get("email") || "") }) });
    setLoading(false);
    setMessage("If an account exists for this email, password reset instructions have been sent.");
    window.location.href = "/auth/check-email";
  }
  return <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8"><h1 className="text-3xl font-bold text-slate-900">Reset your password</h1><p className="mt-2 text-sm text-slate-600">Enter your email to receive secure reset instructions.</p><form action={submit} className="mt-6 grid gap-4"><Field label="Email"><Input name="email" type="email" autoComplete="email" required className="h-12 rounded-xl border-slate-300" /></Field>{message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}<Button disabled={loading} className="h-12 rounded-xl bg-slate-900 hover:bg-slate-800">{loading ? "Sending..." : "Send reset link"}</Button></form><p className="mt-4 text-sm text-slate-600">Remembered your password? <Link href="/auth/signin" className="font-semibold text-cyan-700">Log in</Link></p></div>;
}
