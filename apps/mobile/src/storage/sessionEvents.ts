export type SessionEventValue = { token: string; expires: string; recovery?: { deadline: string }; user: { id: string; email: string; name?: string | null } } | null;
type Listener = (session: SessionEventValue, revokedUserId?: string) => void;
let revision = 0;
const listeners = new Set<Listener>();
export function getSessionRevision() { return revision; }
export function publishSession(session: SessionEventValue, revokedUserId?: string) {
  revision++;
  listeners.forEach(listener => listener(session, revokedUserId));
}
export function subscribeSession(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
