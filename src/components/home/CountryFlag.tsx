import Image from "next/image";
import { COUNTRY_FLAG_ASSET_BY_CODE, type CountryFlagCountryCode } from "@/data/homepageCountryDirectory";

const flagSizeClass = {
  sm: "h-4 w-6",
  md: "h-[18px] w-[27px]",
} as const;

export type CountryFlagProps = {
  countryCode: CountryFlagCountryCode;
  countryName: string;
  size?: keyof typeof flagSizeClass;
};

export function CountryFlag({ countryCode, countryName, size = "md" }: CountryFlagProps) {
  const src = COUNTRY_FLAG_ASSET_BY_CODE[countryCode];

  if (!src) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error(`Missing local flag asset for ${countryCode} (${countryName})`);
    }

    return null;
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center bg-transparent ${flagSizeClass[size]}`}
      aria-hidden="true"
      data-country-flag
      data-country-flag-code={countryCode}
    >
      <Image
        src={src}
        alt=""
        width={60}
        height={40}
        className="block h-full w-full bg-transparent object-contain"
        draggable={false}
      />
    </span>
  );
}
