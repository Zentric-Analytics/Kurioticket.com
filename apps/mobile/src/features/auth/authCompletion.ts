export function scheduleAuthCompletion(onDone: () => void, delayMs = 800) {
  let completed = false;
  const timer = setTimeout(() => {
    if (completed) return;
    completed = true;
    onDone();
  }, delayMs);
  return () => {
    completed = true;
    clearTimeout(timer);
  };
}
