export default function GlobalLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 via-white to-violet-50 p-6">
      <section className="w-full max-w-xl rounded-3xl border border-indigo-100 bg-white p-8 text-center shadow-[0_18px_50px_rgba(79,70,229,0.15)]">
        <h1 className="text-3xl font-black text-indigo-950">
          Kurioticket
        </h1>

        <div className="mx-auto mt-5 h-2 w-48 overflow-hidden rounded-full bg-indigo-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-500" />
        </div>

        <p className="mt-4 text-slate-600">
          Finding the best travel options...
        </p>
      </section>
    </main>
  );
}