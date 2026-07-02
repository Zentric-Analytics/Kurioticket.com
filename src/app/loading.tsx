export default function GlobalLoading() {
  return (
    <main className="min-h-[40svh] bg-gradient-to-b from-[#F2F7FA]/60 via-white to-white py-6">
      <div className="page-shell" role="status" aria-live="polite" aria-busy="true">
        <div className="h-1 w-full overflow-hidden rounded-full bg-[#004BB8]/5" aria-hidden="true">
          <div className="h-full w-1/3 animate-[loading-line_1.5s_ease-in-out_infinite] rounded-full bg-[#004BB8]/20 motion-reduce:animate-none" />
        </div>
        <span className="sr-only">Loading page...</span>
      </div>
    </main>
  );
}
