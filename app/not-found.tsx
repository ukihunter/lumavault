export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-red-500">
          LumaVault
        </p>

        <h1 className="mt-4 text-7xl font-black tracking-tight">
          404
        </h1>

        <h2 className="mt-4 text-2xl font-bold">
          Media not found
        </h2>

        <p className="mt-3 max-w-md text-white/50">
          The movie, series, episode, or page you're looking for doesn't
          exist in your vault.
        </p>

        <a
          href="/"
          className="mt-8 inline-flex rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
        >
          Back to Home
        </a>
      </div>
    </main>
  );
}