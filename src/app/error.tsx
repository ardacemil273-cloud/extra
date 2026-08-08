'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#080b14] text-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">💥</div>
        <h1 className="text-2xl font-black mb-2">Bir şeyler ters gitti</h1>
        <p className="text-gray-400 text-sm mb-2 font-mono bg-white/5 rounded-xl p-3 break-all">
          {error.message || 'Bilinmeyen hata'}
        </p>
        <p className="text-gray-500 text-sm mb-6">Sayfayı yenileyerek tekrar dene.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 text-sm"
          >
            🔄 Tekrar Dene
          </button>
          <a
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl font-bold border border-white/10 bg-white/5 text-sm"
          >
            🏠 Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
