import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
export default function CheckEmailPage(){return <><AppHeader /><main className="page-shell flex flex-1 items-center py-10"><div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg sm:p-8"><h1 className="text-3xl font-bold text-slate-900">Check your email</h1><p className="mt-3 text-sm text-slate-600">If an account exists for this email, password reset instructions have been sent.</p><Link className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 font-semibold text-white hover:bg-slate-800" href="/auth/signin">Return to login</Link></div></main><Footer /></>;}
