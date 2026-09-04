export default function Loading() {
  return (
    <main className="min-h-screen bg-black">
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-red-500" />
      </div>
    </main>
  );
}