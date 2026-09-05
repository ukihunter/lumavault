
import MediaManager from "@/components/admin/MediaManager";
import MediaScanner from "@/components/admin/MediaScanner";

export default function SettingsPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 mt-12">
          <h1 className="text-4xl font-semibold tracking-tight text-red-500 dark:text-red-400 sm:text-4xl">
            Settings
          </h1>

          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your LumaVault server and media libraries.
          </p>
        </div>

        <div className="space-y-8">
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
                Library
              </h2>

              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Add and manage the folders where your movies and TV shows are
                stored.
              </p>
            </div>

            <MediaManager />
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
                Media Scanner
              </h2>

              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Scan your libraries for new or changed media files.
              </p>
            </div>

            <MediaScanner />
          </section>
        </div>
      </div>
    </main>
  );
}

