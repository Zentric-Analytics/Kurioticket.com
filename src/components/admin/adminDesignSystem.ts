import type React from "react";

export function formatAdminBadgeLabel(value: React.ReactNode) {
  if (typeof value !== "string") return value;
  if (!/^[A-Z0-9_ /-]+$/.test(value)) return value;

  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
