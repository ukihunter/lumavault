"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="max-w-md text-center">
        <div className="mb-6 text-6xl font-black text-red-500">!</div>

        <h1 className="text-3xl font-bold">Something went wrong</h1>

        <p className="mt-3 text-white/50">
          LumaVault encountered an unexpected error.
        </p>

        <button
          type="button"
          onClick={() => reset()}
          className="mt-8 rounded-xl bg-red-600 px-6 py-3 font-medium transition hover:bg-red-500"
        >
          Try again
        </button>
      </div>
    </main>
  );
}