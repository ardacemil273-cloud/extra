'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#080b14] text-white flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/6 rounded-full blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative text-center">
        <div className="text-8xl font-black bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent mb-2">
          404
        </div>
        <div className="text-5xl mb-6">👻</div>
        <h1 className="text-2xl font-black mb-2">Sayfa Bulunamadı</h1>
        <p className="text-gray-400 mb-8 max-w-sm">Aradığın sayfa ya taşındı ya silindi ya da hiç olmadı.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/dashboard"
            className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 transition-all active:scale-95">
            🎮 Ana Sayfaya Dön
          </Link>
          <Link href="/room/join"
            className="px-6 py-3 rounded-xl font-bold border border-white/10 bg-white/5 hover:bg-white/10 transition-all active:scale-95">
            🔗 Odaya Katıl
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
