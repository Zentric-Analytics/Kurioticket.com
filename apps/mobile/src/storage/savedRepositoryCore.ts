import type { CarResult,CreateMobileSavedItem,FlightResult,MobileSavedItem } from "../api/travelApi";
import { carSavedSignature,flightSavedSignature,mapCarToSaved,mapDestinationToSaved,mapFlightToSaved,mapHotelToSaved,savedSignature,type SavableFlight } from "./savedMapping";
export type SavedSnapshot={destinationIds:Set<string>;flights:Map<string,FlightResult>;cars:Map<string,MobileSavedItem>;pendingFlightKeys:Set<string>;items:MobileSavedItem[];loading:boolean;error:string};
export type SavedRepositoryDependencies={readCache:(u:string)=>Promise<MobileSavedItem[]>;writeCache:(u:string,v:MobileSavedItem[])=>Promise<void>;list:()=>Promise<{items:MobileSavedItem[];summary:Record<string,number>}>;create:(v:CreateMobileSavedItem)=>Promise<{item:MobileSavedItem}>;remove:(type:MobileSavedItem["type"],id:string)=>Promise<unknown>;readDestinations:(u:string)=>Promise<string[]>;writeDestinations:(u:string,v:readonly string[])=>Promise<void>;readFlights:(u:string)=>Promise<FlightResult[]>;writeFlights:(u:string,v:readonly FlightResult[])=>Promise<void>};
type Listener=(value:SavedSnapshot)=>void;
export function canonicalItemsNewestFirst(items:readonly MobileSavedItem[]){const sorted=[...items].sort((a,b)=>{const at=Date.parse(typeof a.createdAt==="string"?a.createdAt:"")||0;const bt=Date.parse(typeof b.createdAt==="string"?b.createdAt:"")||0;return bt-at;});const signatures=new Set<string>();return sorted.filter(item=>{const signature=savedSignature(item);if(signatures.has(signature))return false;signatures.add(signature);return true;});}
function project(items:MobileSavedItem[]){const destinationIds=new Set<string>();const flights=new Map<string,FlightResult>();const cars=new Map<string,MobileSavedItem>();for(const item of items){if(item.type==="search"){const q=item.query as Record<string,unknown>|undefined;if(typeof q?.destinationId==="string")destinationIds.add(q.destinationId);}if(item.type==="flight"){const p=item.payload as Record<string,unknown>|undefined;const result=p?.result as FlightResult|undefined;if(result?.id)flights.set(flightSavedSignature(result),result);}if(item.type==="car")cars.set(savedSignature(item),item);}return{destinationIds,flights,cars};}
export class SavedRepository {
  private value: SavedSnapshot = { destinationIds: new Set(), flights: new Map(), cars: new Map(), pendingFlightKeys: new Set(), items: [], loading: true, error: "" };
  private listeners = new Set<Listener>();
  private revision = 0;
  private active = true;
  private hydrated = false;
  private confirmed: MobileSavedItem[] = [];
  private pendingFlightKeys = new Set<string>();
  private mutations = new Map<string, { remove?: string; add?: MobileSavedItem }>();
  private cacheWrites: Promise<void> = Promise.resolve();
  constructor(private userId: string, private dependencies: SavedRepositoryDependencies) {}
  snapshot() { return { ...this.value, destinationIds: new Set(this.value.destinationIds), flights: new Map(this.value.flights), cars: new Map(this.value.cars), pendingFlightKeys: new Set(this.value.pendingFlightKeys) }; }
  subscribe(listener: Listener) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private publish(patch: Partial<SavedSnapshot> = {}) {
    let items = [...this.confirmed];
    for (const mutation of this.mutations.values()) {
      if (mutation.remove) items = items.filter(item => item.id !== mutation.remove);
      if (mutation.add) items.push(mutation.add);
    }
    items = canonicalItemsNewestFirst(items);
    this.value = { ...this.value, ...project(items), items, pendingFlightKeys: new Set(this.pendingFlightKeys), ...patch };
    this.listeners.forEach(listener => listener(this.snapshot()));
  }
  private persist() {
    const items = [...this.confirmed];
    this.cacheWrites = this.cacheWrites.catch(() => undefined).then(async () => { if (this.active) await this.dependencies.writeCache(this.userId, items); });
    return this.cacheWrites;
  }
  deactivate(shouldClearCache = () => true) {
    this.active = false; this.revision++; this.confirmed = []; this.mutations.clear(); this.pendingFlightKeys.clear(); this.publish({ loading: false, error: "" });
    // Clear after any already-started write, so late work cannot restore private data.
    this.cacheWrites = this.cacheWrites.catch(() => undefined).then(async () => { if (shouldClearCache()) await this.dependencies.writeCache(this.userId, []); });
    void this.cacheWrites.catch(() => undefined);
  }
  async refresh(options: { hydrateFromCache?: boolean } = {}) {
    if (!this.active || this.mutations.size) return;
    const requested = ++this.revision;
    const current = () => this.active && requested === this.revision;
    const hydrate = (options.hydrateFromCache ?? true) && !this.hydrated;
    if (hydrate) {
      const cached = await this.dependencies.readCache(this.userId).catch(() => []);
      if (!current()) return;
      this.confirmed = canonicalItemsNewestFirst(cached); this.hydrated = true;
      this.publish({ loading: true, error: "" });
    }
    try {
      let items = [...(await this.dependencies.list()).items];
      if (!current()) return;
      const signatures = new Set(items.map(savedSignature));
      const legacy = [...(await this.dependencies.readDestinations(this.userId)).map(mapDestinationToSaved), ...(await this.dependencies.readFlights(this.userId)).map(flight => mapFlightToSaved(flight))];
      let unsupported = 0;
      for (const candidate of legacy) {
        if (!current()) return;
        if (!candidate) { unsupported++; continue; }
        const signature = savedSignature(candidate); if (signatures.has(signature)) continue;
        try { const created = await this.dependencies.create(candidate); items.push({ ...candidate, ...created.item, type: candidate.type }); signatures.add(signature); }
        catch { unsupported++; }
      }
      if (!current()) return;
      if (!unsupported) await Promise.all([this.dependencies.writeDestinations(this.userId, []), this.dependencies.writeFlights(this.userId, [])]);
      if (!current()) return;
      this.confirmed = canonicalItemsNewestFirst(items); this.hydrated = true;
      await this.persist(); if (!current()) return;
      this.publish({ loading: false, error: unsupported ? `${unsupported} legacy save(s) could not be synchronized.` : "" });
    } catch {
      if (current()) this.publish({ loading: false, error: options.hydrateFromCache === false ? "Unable to synchronize saved items. Your saved changes remain available." : "Saved items are offline. Showing the last synchronized copy." });
    }
  }
  async remove(type: MobileSavedItem["type"], id: string) {
    return this.mutate(`remove:${id}`, this.confirmed.find(item => item.id === id), undefined, type, id);
  }
  async toggleDestination(id: string) { const payload = mapDestinationToSaved(id); if (payload) return this.toggle(payload, item => item.type === "search" && (item.query as Record<string, unknown> | undefined)?.destinationId === id); }
  async toggleHotel(hotel: import("../api/travelApi").HotelResult, params: Record<string, unknown>) { const payload = mapHotelToSaved(hotel, params); if (payload) return this.toggle(payload, item => item.type === "hotel" && ((item.payload as Record<string, unknown> | undefined)?.result as { id?: string } | undefined)?.id === hotel.id); }
  async toggleCar(car: CarResult, params: Record<string, unknown>) { const payload = mapCarToSaved(car, params), signature = carSavedSignature(car, params); if (payload && signature) return this.toggle(payload, item => item.type === "car" && savedSignature(item) === signature); }
  async toggleFlight(flight: SavableFlight, params?: Record<string, unknown>) {
    const key = flightSavedSignature(flight); if (this.pendingFlightKeys.has(key)) return;
    this.pendingFlightKeys.add(key);
    try { return await this.toggle(mapFlightToSaved(flight, params), item => item.type === "flight" && savedSignature(item) === key); }
    finally { this.pendingFlightKeys.delete(key); if (this.active) this.publish(); }
  }
  private async toggle(payload: CreateMobileSavedItem, match: (item: MobileSavedItem) => boolean) {
    return this.mutate(savedSignature(payload), this.confirmed.find(match), payload);
  }
  private async mutate(key: string, existing?: MobileSavedItem, payload?: CreateMobileSavedItem, removeType?: MobileSavedItem["type"], removeId?: string) {
    if (!this.active) throw new Error("Account changed. Refresh before trying again.");
    if (this.mutations.has(key)) return;
    this.revision++;
    const id = existing?.id ?? removeId;
    this.mutations.set(key, id ? { remove: id } : { add: { ...payload, id: `optimistic-${key}`, createdAt: new Date().toISOString() } as MobileSavedItem });
    this.publish({ error: "" });
    try {
      if (id) {
        try { await this.dependencies.remove(existing?.type ?? removeType!, id); }
        catch (error) { if ((error as { status?: number }).status !== 404) throw error; }
        if (!this.active) return;
        this.confirmed = this.confirmed.filter(item => item.id !== id);
      } else {
        const created = await this.dependencies.create(payload!);
        if (!this.active) return;
        this.confirmed = canonicalItemsNewestFirst([...this.confirmed, { ...payload, ...created.item, type: payload!.type } as MobileSavedItem]);
      }
    } catch (error) {
      this.mutations.delete(key);
      if (this.active) { this.publish({ error: id ? "Unable to remove saved item. The previous state was restored." : "Unable to update saved items. Your previous saved state was restored." }); await this.persist().catch(() => undefined); }
      throw error;
    }
    this.mutations.delete(key);
    if (!this.active) return;
    if (!id) this.publish({ loading: false });
    await this.persist().catch(() => undefined);
    if (!this.mutations.size) await this.refresh({ hydrateFromCache: false });
  }
}
