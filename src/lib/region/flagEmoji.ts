export function getFlagEmojiFromCountryCode(countryCode: string) {
  const normalizedCode = countryCode.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalizedCode)) return "";

  return [...normalizedCode]
    .map((letter) => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65))
    .join("");
}
