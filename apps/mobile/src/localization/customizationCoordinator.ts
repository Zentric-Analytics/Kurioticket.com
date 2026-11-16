import type { MobileLocale } from "./mobileLocalizationCatalog";
import type { MarketplaceSource } from "../../../../src/shared/marketplace/marketplaceContext";
export type PreferenceOwner = { userId: string | null };
export type PreferenceValue = { locale: MobileLocale; currency: string; region?: string; marketplaceSource?: MarketplaceSource; hasExplicitMarket?: boolean; hasExplicitCurrency?: boolean };
export type ServerPreferences = { hasPreferences: boolean; preferences: PreferenceValue };
export type CoordinatorDependencies = {
  readGuest: () => Promise<PreferenceValue>;
  writeGuest: (value: PreferenceValue) => Promise<void>;
  readAccountCache: (userId: string, guest: PreferenceValue) => Promise<PreferenceValue | null>;
  writeAccountCache: (userId: string, value: PreferenceValue) => Promise<void>;
  fetchAccount: (expectedUserId?: string) => Promise<ServerPreferences>;
  patchAccount: (value: Partial<PreferenceValue>, expectedUserId?: string, initializeIfAbsent?: boolean) => Promise<PreferenceValue>;
};
export class CustomizationCoordinator {
  private revision = 0; private owner: PreferenceOwner = { userId: null }; private value: PreferenceValue = { locale: "en-us", currency: "USD" };
  private confirmed: PreferenceValue = this.value;
  private guestValue: PreferenceValue = this.value;
  private pendingWrites = 0;
  private ownerEpoch = 0;
  private mutationQueue: Promise<void> = Promise.resolve();
  constructor(private dependencies: CoordinatorDependencies, private publish: (value: PreferenceValue) => void) {}
  snapshot() { return { ...this.value }; }
  async transition(owner: PreferenceOwner) {
    const changedOwner = this.owner.userId !== owner.userId;
    if (!changedOwner && this.pendingWrites) return;
    const revision = ++this.revision; this.owner = owner;
    if (changedOwner) { this.ownerEpoch++; this.confirmed = this.guestValue; this.set(this.guestValue); }
    const guest = await this.dependencies.readGuest(); if (revision !== this.revision) return;
    this.guestValue = guest;
    if (changedOwner) this.set(guest);
    if (!owner.userId) { this.confirmed = guest; this.set(guest); return; }
    const cached = await this.dependencies.readAccountCache(owner.userId, guest); if (revision !== this.revision) return;
    if (cached) { this.confirmed = cached; this.set(cached); }
    try {
      const server = await this.dependencies.fetchAccount(owner.userId); if (revision !== this.revision || this.owner.userId !== owner.userId) return;
      const resolved = server.hasPreferences ? server.preferences : await this.dependencies.patchAccount(guest, owner.userId, true);
      if (revision !== this.revision || this.owner.userId !== owner.userId) return;
      this.confirmed = resolved; this.set(resolved); await this.dependencies.writeAccountCache(owner.userId, resolved);
    } catch { if (!cached && revision === this.revision) this.set(guest); }
  }
  async refresh() { return this.transition({ ...this.owner }); }
  async mutate(patch: Partial<PreferenceValue>) {
    const revision = ++this.revision; const next = { ...this.value, ...patch }; this.set(next);
    if (!this.owner.userId) { await this.dependencies.writeGuest(next); return; }
    const userId = this.owner.userId;
    const ownerEpoch = this.ownerEpoch;
    this.pendingWrites++;
    const operation = this.mutationQueue.catch(() => undefined).then(async () => {
      try {
        if (this.owner.userId !== userId || ownerEpoch !== this.ownerEpoch) throw new Error("Account changed. Preferences were not synchronized.");
        const saved = await this.dependencies.patchAccount(patch, userId);
        if (this.owner.userId !== userId || ownerEpoch !== this.ownerEpoch) return;
        this.confirmed = saved;
        if (revision === this.revision) this.set(saved);
        await this.dependencies.writeAccountCache(userId, saved);
      } catch (error) { if (revision === this.revision && this.owner.userId === userId) this.set(this.confirmed); throw error; }
      finally { this.pendingWrites--; }
    });
    this.mutationQueue = operation.catch(() => undefined);
    await operation;
  }
  private set(value: PreferenceValue) { this.value = value; this.publish({ ...value }); }
}

export function normalizeCachedPreference(raw: Partial<PreferenceValue>, guest: PreferenceValue): PreferenceValue {
  const currency = typeof raw.currency === "string" && /^[A-Z]{3}$/.test(raw.currency.toUpperCase()) ? raw.currency.toUpperCase() : guest.currency;
  return {
    ...guest,
    locale: raw.locale ?? guest.locale,
    currency,
    region: raw.region ?? guest.region,
    marketplaceSource: raw.region ? "ACCOUNT" : guest.marketplaceSource,
    hasExplicitMarket: Boolean(raw.region) || guest.hasExplicitMarket,
    hasExplicitCurrency: raw.hasExplicitCurrency ?? Boolean(raw.currency),
  };
}
