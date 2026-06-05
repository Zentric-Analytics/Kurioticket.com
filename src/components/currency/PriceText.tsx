"use client";

import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";

type PriceTextProps = {
  amountUsd: number;
  className?: string;
  sourceAmount?: number;
  sourceCurrency?: string;
  convertUsdEstimate?: boolean;
  showEstimateTitle?: boolean;
  maximumFractionDigits?: number;
};

export function PriceText({
  amountUsd,
  className,
  sourceAmount,
  sourceCurrency = "USD",
  convertUsdEstimate = true,
  showEstimateTitle = true,
  maximumFractionDigits,
}: PriceTextProps) {
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const price = formatDisplayPrice({
    amount: sourceAmount ?? amountUsd,
    sourceCurrency,
    displayCurrency: selectedOption.currency,
    convertUsdEstimate,
    maximumFractionDigits,
    rates: currencyRates.rates,
    isFallbackRate: currencyRates.isFallback,
  });

  return (
    <span className={className} title={showEstimateTitle ? price.title : undefined}>
      {price.formatted}
    </span>
  );
}
