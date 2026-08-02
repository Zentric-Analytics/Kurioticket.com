export type ProfileIdentity = {
  name: string;
  email: string;
  initial: string;
};

export function profileIdentity(user: { name?: string | null; email?: string | null } | null): ProfileIdentity {
  const email = user?.email?.trim() || "";
  const name = user?.name?.trim() || (email ? email.split("@")[0] : "Traveler");
  return {
    name,
    email,
    initial: (name || email || "T").slice(0, 1).toUpperCase(),
  };
}

export function membershipLabel(createdAt?: string | null, locale?: string) {
  if (!createdAt) return "Member";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Member";
  return `Member since ${new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date)}`;
}
