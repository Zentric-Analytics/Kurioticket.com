export type SavedDestinationReader = () => Promise<string[]>;
export type SavedDestinationWriter = (ids: readonly string[]) => Promise<void>;
type Listener = (ids: Set<string>) => void;

/** Orders optimistic mutations, writes, and refreshes without allowing an old read to win. */
export class SavedDestinationsStore {
  private ids = new Set<string>();
  private revision = 0;
  private listeners = new Set<Listener>();
  private writes: Promise<void> = Promise.resolve();

  constructor(private readonly read: SavedDestinationReader, private readonly write: SavedDestinationWriter) {}

  snapshot() { return new Set(this.ids); }
  subscribe(listener: Listener) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }

  async refresh() {
    const requestedAt = this.revision;
    await this.writes;
    if (requestedAt !== this.revision) return;
    const startedAt = requestedAt;
    const stored = await this.read();
    if (startedAt === this.revision) this.publish(new Set(stored), false);
  }

  toggle(id: string) {
    const next = this.snapshot();
    next.has(id) ? next.delete(id) : next.add(id);
    this.publish(next, true);
    const intended = [...next];
    const operation = this.writes.then(() => this.write(intended));
    this.writes = operation.catch(() => undefined);
    void operation.catch(() => this.refresh().catch(() => undefined));
    return operation;
  }

  private publish(ids: Set<string>, mutate: boolean) {
    this.ids = ids;
    if (mutate) this.revision += 1;
    this.listeners.forEach((listener) => listener(new Set(ids)));
  }
}
