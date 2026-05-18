"use client";
import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { signupSchema } from "@/lib/validation";

export function SignupForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true); setError("");
    const input = { name: String(formData.get("name") || ""), email: String(formData.get("email") || ""), password: String(formData.get("password") || ""), confirmPassword: String(formData.get("confirmPassword") || "") };
    if (input.password !== input.confirmPassword) { setLoading(false); setError("Passwords do not match."); return; }
    const parsed = signupSchema.safeParse({ name: input.name, email: input.email, password: input.password });
    if (!parsed.success) { setLoading(false); setError("Please enter valid account details and a stronger password."); return; }
    const response = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
    const data = await response.json(); setLoading(false);
    if (!response.ok) { setError(String(data.error || "Unable to create account right now.")); return; }
    window.location.href = `/auth/verify-email?email=${encodeURIComponent(parsed.data.email)}`;
  }

  return <Card className="mx-auto w-full max-w-md rounded-2xl border-slate-200 p-6 shadow-lg sm:p-8"><h1 className="text-2xl font-bold text-navy">Create your account</h1><p className="mt-2 text-sm text-muted">Continue to smarter travel planning with CurioTicket.</p><form action={submit} className="mt-5 grid gap-4"><Field label="Full name"><Input name="name" autoComplete="name" required /></Field><Field label="Email"><Input name="email" type="email" autoComplete="email" required /></Field><Field label="Password"><Input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required /></Field><Field label="Confirm password"><Input name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required /></Field><p className="text-xs text-muted">Use at least 8 characters with letters and numbers for a strong password.</p><button type="button" onClick={() => setShowPassword((v) => !v)} className="justify-self-start text-xs font-semibold text-cyan-700">{showPassword ? "Hide passwords" : "Show passwords"}</button>{error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}<Button disabled={loading}>{loading ? "Creating account..." : "Sign up"}</Button></form>{googleEnabled ? <Button variant="secondary" className="mt-3 w-full" onClick={() => signIn("google", { callbackUrl: "/onboarding" })}>Continue with Google</Button> : null}<p className="mt-4 text-sm text-muted">Already have an account? <Link className="font-semibold text-teal-dark" href="/auth/signin">Log in</Link></p></Card>;
}
