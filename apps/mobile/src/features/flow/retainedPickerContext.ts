export function retainActivePresentationContext<T>(previous: T, active: boolean, incoming: T) {
  return active ? incoming : previous;
}
