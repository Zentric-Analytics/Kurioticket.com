"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function PremiumCheckout({ interval }: { interval: "month" | "year" }) {
  const [loading, setLoading] = useState(false);
  const label = interval === "month" ? "Start Monthly Trial" : "Start Annual Trial";

  async function checkout() {
    setLoading(true);
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval }),
    });
    const data = (await response.json()) as { url?: string; error?: string };
    setLoading(false);
    if (data.url) window.location.href = data.url;
    if (data.error) window.location.href = `/auth/signin?next=/pricing`;
  }

  return (
    <Button variant={interval === "year" ? "accent" : "primary"} className="w-full" onClick={checkout} disabled={loading}>
      {loading ? "Preparing Stripe..." : label}
    </Button>
  );
}
