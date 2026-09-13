"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readKayakOffer, type StoredKayakOffer } from "@/components/results/kayakOfferStorage";

export function KayakSandboxDetails({id}:{id:string}) {
  const [stored,setStored]=useState<StoredKayakOffer|null|undefined>(undefined);
  useEffect(()=>{
    let active=true;
    queueMicrotask(()=>{ if (active) setStored(readKayakOffer(sessionStorage,id)); });
    return ()=>{ active=false; };
  },[id]);
  if (stored === undefined) return <p role="status">Loading result details…</p>;
  if (!stored) return <div className="rounded-xl border bg-white p-6"><h1 className="text-2xl font-bold">Result details are no longer available</h1><p className="mt-2">Return to the search results and open this offer again.</p><Link className="mt-4 inline-block text-[#004BB8] underline" href="/">Start a new search</Link></div>;
  const {offer,vertical}=stored;
  return <article className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-sm font-semibold text-amber-800">KAYAK sandbox · Not bookable</p>
    <div><p className="text-sm uppercase text-slate-500">{vertical.slice(0,-1)} result</p><h1 className="text-3xl font-bold">{offer.title}</h1><p className="mt-2">{offer.description}</p></div>
    {offer.images?.length ? <div className="grid gap-3 sm:grid-cols-2">{offer.images.map((image,index)=><div key={image.url} className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-100"><Image src={image.url} alt={image.alt} fill priority={index===0} className="object-cover" /></div>)}</div> : null}
    <section><h2 className="text-xl font-bold">Supplied details</h2><p className="mt-2 font-semibold">{offer.price} {offer.currency} · {offer.priceBasis}</p><ul className="mt-3 list-disc space-y-1 pl-5">{offer.details.map((detail,index)=><li key={index}>{detail}</li>)}</ul></section>
    {offer.flightLegs?.map((leg,index)=><section key={index}><h2 className="font-bold">{index === 0 ? "Outbound" : index === 1 ? "Return" : `Leg ${index + 1}`}</h2><ul className="list-disc pl-5">{leg.segments.map((segment,segmentIndex)=><li key={`${segment.origin}-${segment.destination}-${segment.departure}-${segmentIndex}`}>{segment.origin} → {segment.destination} · {segment.departure} – {segment.arrival}{segment.airline ? ` · ${segment.airline} ${segment.flightNumber}`:""}{segment.operatingDisclosure ? ` · ${segment.operatingDisclosure}`:""}</li>)}</ul></section>)}
    {offer.attributes?.length ? <dl className="grid gap-3 sm:grid-cols-2">{offer.attributes.map((attribute,index)=><div key={index} className="rounded-lg bg-slate-50 p-3"><dt className="font-semibold">{attribute.label}</dt><dd className="break-words">{attribute.value}</dd></div>)}</dl> : null}
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4"><h2 className="font-bold">Sandbox test link</h2><p className="my-2">This opens an approved KAYAK test page. It cannot complete a real booking or payment.</p><a href={offer.testUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="inline-block rounded-md bg-[#004BB8] px-4 py-2 font-semibold text-white">Open KAYAK test page</a></section>
  </article>;
}
