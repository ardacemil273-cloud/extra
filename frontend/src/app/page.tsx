'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

const features = [
  { icon: '🎮', title: 'Gerçek Zamanlı Oyunlar', desc: 'Socket.IO ile senkronize, lag-free deneyim' },
  { icon: '🧛', title: 'Vampir Köylü', desc: 'Roller, gece/gündüz döngüsü, yapay zeka anlatıcı' },
  { icon: '🎙️', title: 'Sesli Sohbet', desc: 'WebRTC ile kristal netliğinde ses, push-to-talk' },
  { icon: '👥', title: 'Arkadaş Sistemi', desc: 'Davet et, oda oluştur, birlikte oyna' },
  { icon: '🏆', title: 'XP & Seviye', desc: 'Kazan, yüksel, rozetleri topla' },
  { icon: '🔒', title: 'Güvenli', desc: 'JWT, rate limiting, anti-cheat koruması' },
];

const games = [
  { id: 'vampire-village', name: 'Vampir Köylü', icon: '🧛', players: '4-16', tag: 'Mevcut', tagColor: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { id: 'mafia', name: 'Mafya', icon: '🔫', players: '6-20', tag: 'Yakında', tagColor: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  { id: 'bomb-party', name: 'Bomb Party', icon: '💣', players: '2-10', tag: 'Yakında', tagColor: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  { id: 'draw-guess', name: 'Çizim Oyunu', icon: '🎨', players: '2-12', tag: 'Yakında', tagColor: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#080b14] text-white overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-fuchsia-600/6 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/5 bg-[#080b14]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center text-sm">
              🎮
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              PartyVerse
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 transition-all"
            >
              Kayıt Ol
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-24 pb-20 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Canlı — Gerçek zamanlı sosyal oyun platformu
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            Arkadaşlarınla{' '}
            <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              eğlen,
            </span>
            <br />
            birlikte{' '}
            <span className="bg-gradient-to-r from-pink-400 via-red-400 to-orange-400 bg-clip-text text-transparent">
              kazan!
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Discord + Jackbox kalitesinde, tarayıcıdan çalışan sosyal parti oyun platformu.
            Hesap aç, oda oluştur, arkadaşlarını davet et ve oynamaya başla.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              Ücretsiz Başla →
            </Link>
            <Link
              href="/guest"
              className="px-8 py-4 rounded-2xl font-bold text-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              👤 Misafir Olarak Gir
            </Link>
          </div>
        </motion.div>

        {/* Hero card preview */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-20 max-w-4xl mx-auto"
        >
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-1">
            <div className="rounded-[22px] bg-[#0d1117] overflow-hidden">
              {/* Fake game preview */}
              <div className="bg-[#0a0e1a] p-6 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs text-gray-500 font-mono">partyverse.app/game/ABC123</span>
                <div className="w-16" />
              </div>
              <div className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: 'Ahmet', role: '🧛', alive: true, color: 'border-red-500/50 bg-red-500/5' },
                    { name: 'Zeynep', role: '💉', alive: true, color: 'border-green-500/50 bg-green-500/5' },
                    { name: 'Burak', role: '🔍', alive: true, color: 'border-blue-500/50 bg-blue-500/5' },
                    { name: 'Selin', role: '🧑', alive: false, color: 'border-gray-700 bg-gray-900 opacity-50' },
                  ].map((p, i) => (
                    <div key={i} className={`rounded-xl p-4 border ${p.color} text-center`}>
                      <div className="text-3xl mb-2">{p.role}</div>
                      <div className="text-sm font-semibold text-white">{p.name}</div>
                      <div className={`text-xs mt-1 ${p.alive ? 'text-green-400' : 'text-red-400'}`}>
                        {p.alive ? '● Hayatta' : '✕ Elendi'}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-red-900/40 to-red-800/40 border border-red-700/50 text-red-300 text-sm font-semibold">
                    🌙 Gece Başladı — Vampir seçimini yapıyor...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Games */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black mb-4">Oyunlar</h2>
            <p className="text-gray-400">Hepsi tek platformda, gerçek zamanlı</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {games.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative rounded-2xl border border-white/8 bg-white/3 p-6 text-center hover:border-purple-500/30 hover:bg-purple-500/5 transition-all cursor-pointer group"
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{game.icon}</div>
                <div className="font-bold text-white mb-1">{game.name}</div>
                <div className="text-xs text-gray-500 mb-3">{game.players} oyuncu</div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${game.tagColor}`}>
                  {game.tag}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black mb-4">Neden PartyVerse?</h2>
            <p className="text-gray-400">Production-ready, güvenli, ölçeklenebilir</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-white/8 bg-white/3 p-6 hover:border-purple-500/20 transition-all"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <div className="font-bold text-white mb-2">{f.title}</div>
                <div className="text-sm text-gray-400">{f.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6 text-center border-t border-white/5">
        <h2 className="text-4xl font-black mb-4">Hemen oynamaya başla</h2>
        <p className="text-gray-400 mb-8">Hesap oluşturmak 30 saniye sürer. Veya misafir olarak gir.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="px-8 py-4 rounded-2xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 transition-all hover:-translate-y-0.5"
          >
            Kayıt Ol — Ücretsiz
          </Link>
          <Link
            href="/guest"
            className="px-8 py-4 rounded-2xl font-bold border border-white/10 bg-white/5 hover:bg-white/10 transition-all hover:-translate-y-0.5"
          >
            Misafir Olarak Gir
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-6 text-center text-sm text-gray-600">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-lg">🎮</span>
          <span className="font-bold text-gray-400">PartyVerse</span>
        </div>
        <p>Gerçek zamanlı sosyal parti oyun platformu</p>
      </footer>
    </div>
  );
}
