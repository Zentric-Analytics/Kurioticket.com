export type PreferenceOwner = { userId: string | null };
export type PreferenceValue = { locale: "en-us" | "es-es"; currency: string };
export type ServerPreferences = { hasPreferences: boolean; preferences: PreferenceValue };
export type CoordinatorDependencies = {
  readGuest: () => Promise<PreferenceValue>;
  writeGuest: (value: PreferenceValue) => Promise<void>;
  readAccountCache: (userId: string) => Promise<PreferenceValue | null>;
  writeAccountCache: (userId: string, value: PreferenceValue) => Promise<void>;
  fetchAccount: () => Promise<ServerPreferences>;
  patchAccount: (value: Partial<PreferenceValue>) => Promise<PreferenceValue>;
};
export class CustomizationCoordinator {
  private revision = 0; private owner: PreferenceOwner = { userId: null }; private value: PreferenceValue = { locale: "en-us", currency: "USD" };
  constructor(private dependencies: CoordinatorDependencies, private publish: (value: PreferenceValue) => void) {}
  snapshot() { return { ...this.value }; }
  async transition(owner: PreferenceOwner) {
    const revision = ++this.revision; this.owner = owner;
    const guest = await this.dependencies.readGuest(); if (revision !== this.revision) return;
    if (!owner.userId) { this.set(guest); return; }
    const cached = await this.dependencies.readAccountCache(owner.userId); if (revision !== this.revision) return;
    if (cached) this.set(cached);
    try {
      const server = await this.dependencies.fetchAccount(); if (revision !== this.revision || this.owner.userId !== owner.userId) return;
      const resolved = server.hasPreferences ? server.preferences : await this.dependencies.patchAccount(guest);
      if (revision !== this.revision || this.owner.userId !== owner.userId) return;
      this.set(resolved); await this.dependencies.writeAccountCache(owner.userId, resolved);
    } catch { if (!cached && revision === this.revision) this.set(guest); }
  }
  async refresh() { return this.transition({ ...this.owner }); }
  async mutate(patch: Partial<PreferenceValue>) {
    const revision = ++this.revision; const next = { ...this.value, ...patch }; this.set(next);
    if (!this.owner.userId) { await this.dependencies.writeGuest(next); return; }
    const userId = this.owner.userId;
    try { const saved = await this.dependencies.patchAccount(patch); if (revision === this.revision && this.owner.userId === userId) { this.set(saved); await this.dependencies.writeAccountCache(userId, saved); } }
    catch (error) { if (revision === this.revision && this.owner.userId === userId) await this.dependencies.writeAccountCache(userId, next); throw error; }
  }
  private set(value: PreferenceValue) { this.value = value; this.publish({ ...value }); }
}
