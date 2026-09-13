import { notFound } from "next/navigation";
import { isKayakSandboxEnabled } from "@/services/travel/kayakSandbox";
import { KayakSandboxDetails } from "./KayakSandboxDetails";

export const metadata={title:"Result details | Kurioticket",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  if (!isKayakSandboxEnabled()) notFound();
  const raw=(await searchParams).id;
  const id=typeof raw === "string" ? raw : "";
  if (!id || id.length>300) notFound();
  return <main className="mx-auto max-w-5xl px-4 py-8"><KayakSandboxDetails id={id}/></main>;
}
