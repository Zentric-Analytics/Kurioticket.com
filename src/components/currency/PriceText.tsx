"use client";

import { useRegion } from "@/components/region/RegionProvider";
import { formatCurrencyFromUsd } from "@/lib/currency/formatCurrency";

export function PriceText({ amountUsd, className }: { amountUsd: number; className?: string }) {
  const { selectedOption } = useRegion();
  return <span className={className}>{formatCurrencyFromUsd(amountUsd, selectedOption.currency)}</span>;
}
