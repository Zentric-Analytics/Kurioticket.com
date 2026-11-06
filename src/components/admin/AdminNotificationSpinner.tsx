export function AdminNotificationSpinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" data-notification-spinner
      className={"shrink-0 animate-spin [animation-duration:900ms] motion-reduce:animate-none " + className}>
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" opacity="0.14" />
      <path d="M10 2.75a7.25 7.25 0 0 1 7.25 7.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
