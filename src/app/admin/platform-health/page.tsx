import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminApiSession } from "@/lib/admin";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { PlatformHealthDashboard } from "@/components/admin/PlatformHealthDashboard";
import { parsePlatformHealthView } from "@/lib/platformHealthPresentation";
import { readPlatformOperations } from "@/services/platformOperationsService";
export const metadata = { title: "Admin Platform Health" };
export const dynamic = "force-dynamic";
export default async function PlatformHealthPage({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    await requireAdminSession("/admin/platform-health");
    const access = await requireAdminApiSession();
    if ("response" in access && access.response)
        redirect("/dashboard");
    const raw = await searchParams, params = new URLSearchParams();
    for (const [key, value] of Object.entries(raw)) {
        if (Array.isArray(value))
            value.forEach(v => params.append(key, v));
        else if (value !== undefined)
            params.append(key, value);
    }
    const view = parsePlatformHealthView(params);
    const timeZone = await getAdminViewerTimeZone(access.session?.user?.id);
    return <AdminPageShell title="Platform Health" hideHeader>{view ? <PlatformHealthDashboard key={`${view.period}-${view.hours}-${view.application}-${timeZone}`} data={await readPlatformOperations(view.hours, view.period, timeZone)} {...view}/> : <section role="alert" className="rounded-xl border border-amber-200 bg-white p-6"><h2 className="text-xl font-semibold">Check the health filters</h2><p className="mt-2 text-sm text-slate-600">Choose an application and a Today, 7-day or 30-day window. Environment is set by this deployment.</p><Link href="/admin/platform-health" className="focus-ring mt-4 inline-block text-sm text-[#004BB8]">Reset filters</Link></section>}</AdminPageShell>;
}
