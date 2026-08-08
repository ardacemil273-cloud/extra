'use client';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

const GAMES = [
  { id: 'vampire-village', name: 'Vampir Köylü', icon: '🧛', desc: 'Rolleri keşfet, vampiri bul', tag: 'Mevcut', color: 'from-red-900/40 to-red-800/20', border: 'border-red-700/30', glow: 'shadow-red-900/30', players: '4-16' },
  { id: 'mafia', name: 'Mafya', icon: '🔫', desc: 'Klasik masa oyunu', tag: 'Yakında', color: 'from-gray-900/40 to-gray-800/20', border: 'border-gray-700/30', glow: '', players: '6-20' },
  { id: 'bomb-party', name: 'Bomb Party', icon: '💣', desc: 'Hızlı kelime oyunu', tag: 'Yakında', color: 'from-orange-900/40 to-orange-800/20', border: 'border-orange-700/30', glow: '', players: '2-10' },
  { id: 'draw', name: 'Çizim Oyunu', icon: '🎨', desc: 'Çiz ve tahmin et', tag: 'Yakında', color: 'from-blue-900/40 to-blue-800/20', border: 'border-blue-700/30', glow: '', players: '2-12' },
];

const FEATURES = [
  { icon: '⚡', title: 'Gerçek Zamanlı', desc: 'Socket.IO ile sıfır gecikme. Her aksiyon anında yansır.' },
  { icon: '🎙️', title: 'Sesli Sohbet', desc: 'WebRTC tabanlı kristal net ses, push-to-talk desteği.' },
  { icon: '🔒', title: 'Güvenli', desc: 'JWT auth, rate limiting, anti-cheat sistemi.' },
  { icon: '📱', title: 'Her Cihazda', desc: 'Mobil, tablet, masaüstü — tam responsive.' },
  { icon: '👥', title: 'Sosyal', desc: 'Arkadaş sistemi, bildirimler, oda davetleri.' },
  { icon: '🏆', title: 'Rekabet', desc: 'XP, level, rozetler ve istatistikler.' },
];

const STEPS = [
  { n: '01', title: 'Hesap Oluştur', desc: 'Google, Discord veya e-posta ile 30 saniyede kayıt ol.' },
  { n: '02', title: 'Oda Kur', desc: 'Yeni oda oluştur veya arkadaşının odasına katıl.' },
  { n: '03', title: 'Oyna', desc: 'Oyunu seç, rolünü al, galip gel!' },
];

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, .7], [1, 0]);

  return (
    <div className="min-h-screen bg-[#080b14] text-white overflow-x-hidden">

      {/* ── Ambient background ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-purple-700/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-violet-800/6 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-40 w-[500px] h-[500px] bg-fuchsia-800/5 rounded-full blur-[100px]" />
        {/* Stars */}
        {[...Array(40)].map((_, i) => (
          <div key={i} className="absolute w-px h-px bg-white rounded-full"
            style={{ top: `${Math.random()*100}%`, left: `${Math.random()*100}%`, opacity: Math.random()*.4+.1 }} />
        ))}
      </div>

      {/* ── Navbar ── */}
      <nav className="relative z-50 border-b border-white/5 bg-[#080b14]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center text-sm font-black">
              🎮
            </div>
            <span className="font-black text-lg">
              <span className="text-white">Party</span>
              <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">Verse</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#oyunlar" className="hover:text-white transition-colors">Oyunlar</a>
            <a href="#ozellikler" className="hover:text-white transition-colors">Özellikler</a>
            <a href="#nasil" className="hover:text-white transition-colors">Nasıl Çalışır?</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
              Giriş Yap
            </Link>
            <Link href="/register"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-sm font-bold transition-all hover:scale-105 shadow-lg shadow-purple-500/20">
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} className="relative z-10 pt-20 pb-32 px-6 text-center overflow-hidden">
        <motion.div style={{ y: heroY, opacity: heroOpacity }}>
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-4xl mx-auto">

            {/* Badge */}
            <motion.div variants={fadeUp}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Gerçek zamanlı sosyal parti oyun platformu
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={fadeUp} className="text-5xl sm:text-7xl font-black leading-tight tracking-tight">
              <span className="text-white">Arkadaşlarınla</span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                eğlen, kazan,
              </span>
              <br />
              <span className="text-white">hükmet!</span>
            </motion.h1>

            {/* Sub */}
            <motion.p variants={fadeUp} className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Vampir Köylü ve daha fazlası. Discord kalitesinde sesli sohbet,
              gerçek zamanlı oyunlar, sosyal arkadaş sistemi — hepsi tarayıcıdan.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link href="/register"
                className="group relative px-8 py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 transition-all hover:-translate-y-1 shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40">
                <span className="relative z-10">Hemen Oyna — Ücretsiz</span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400 to-fuchsia-400 opacity-0 group-hover:opacity-20 blur transition-opacity" />
              </Link>
              <Link href="/guest"
                className="px-8 py-4 rounded-2xl font-bold text-lg border border-white/10 bg-white/3 hover:bg-white/8 hover:border-white/20 transition-all hover:-translate-y-1 backdrop-blur">
                👤 Misafir Olarak Gir
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-6 pt-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><span className="text-green-400 font-bold">✓</span> Ücretsiz</span>
              <span className="w-px h-4 bg-white/10" />
              <span className="flex items-center gap-1.5"><span className="text-green-400 font-bold">✓</span> Kayıt gerektirmiyor</span>
              <span className="w-px h-4 bg-white/10" />
              <span className="flex items-center gap-1.5"><span className="text-green-400 font-bold">✓</span> Anında başla</span>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* ── Game Preview Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: .96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: .5, duration: .8, ease: 'easeOut' }}
          className="mt-20 max-w-3xl mx-auto"
        >
          <div className="relative rounded-3xl border border-white/8 bg-gradient-to-b from-white/4 to-transparent p-1 shadow-2xl shadow-purple-900/20">
            {/* Top bar */}
            <div className="rounded-[22px] bg-[#0d1117] overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-[#080b14]">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-3 text-xs text-gray-600 font-mono">partyverse.app/game/ABC123</span>
              </div>
              {/* Game preview */}
              <div className="p-6">
                {/* Phase bar */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    <span className="text-xs font-semibold text-red-400 tracking-widest uppercase">🌙 Gece — Tur 2</span>
                  </div>
                  <span className="text-xs text-gray-600 font-mono">25s kaldı</span>
                </div>
                {/* Players */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[
                    { name: 'Ahmet', role: '🧛', roleLabel: 'Vampir', alive: true, color: 'border-red-500/40 bg-red-500/5' },
                    { name: 'Zeynep', role: '💉', roleLabel: 'Doktor', alive: true, color: 'border-green-500/40 bg-green-500/5' },
                    { name: 'Burak', role: '🔍', roleLabel: 'Dedektif', alive: true, color: 'border-blue-500/40 bg-blue-500/5' },
                    { name: 'Selin', role: '💀', roleLabel: 'Öldü', alive: false, color: 'border-gray-700/40 bg-gray-900/30 opacity-50' },
                  ].map((p, i) => (
                    <div key={i} className={`rounded-xl border p-3 text-center ${p.color} transition-all`}>
                      <div className="text-2xl mb-1">{p.role}</div>
                      <div className="text-xs font-semibold">{p.name}</div>
                      <div className={`text-xs mt-0.5 ${p.alive ? 'text-green-400' : 'text-gray-600'}`}>{p.roleLabel}</div>
                    </div>
                  ))}
                </div>
                {/* Narrator */}
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3">
                  <p className="text-sm text-purple-300 italic">
                    🎭 "Karanlık çöktü... Vampir bu gece kurbanını seçiyor."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── OYUNLAR ── */}
      <section id="oyunlar" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }} className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Oyunlar</h2>
            <p className="text-gray-400 text-lg">Hepsi gerçek zamanlı, hepsi tarayıcıdan</p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {GAMES.map((g, i) => (
              <motion.div key={g.id} variants={fadeUp}>
                {g.tag === 'Mevcut' ? (
                  <Link href="/room/create"
                    className={`block rounded-2xl border ${g.border} bg-gradient-to-b ${g.color} p-5 text-center hover:-translate-y-1 hover:shadow-lg ${g.glow} transition-all duration-200 cursor-pointer group`}>
                    <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">{g.icon}</div>
                    <div className="font-bold text-base mb-1">{g.name}</div>
                    <div className="text-xs text-gray-500 mb-3">{g.desc}</div>
                    <div className="text-xs text-gray-600 mb-2">{g.players} oyuncu</div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-semibold">
                      Oyna →
                    </span>
                  </Link>
                ) : (
                  <div className={`rounded-2xl border ${g.border} bg-gradient-to-b ${g.color} p-5 text-center opacity-50 cursor-not-allowed`}>
                    <div className="text-5xl mb-3">{g.icon}</div>
                    <div className="font-bold text-base mb-1">{g.name}</div>
                    <div className="text-xs text-gray-500 mb-3">{g.desc}</div>
                    <div className="text-xs text-gray-600 mb-2">{g.players} oyuncu</div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-gray-700/30 border border-gray-700/30 text-gray-500 text-xs">
                      Yakında
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── ÖZELLİKLER ── */}
      <section id="ozellikler" className="relative z-10 py-24 px-6 border-t border-white/4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }} className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Neden PartyVerse?</h2>
            <p className="text-gray-400 text-lg">AAA oyun kalitesi, tarayıcı kolaylığı</p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div key={i} variants={fadeUp}
                className="rounded-2xl border border-white/6 bg-white/2 p-6 hover:border-purple-500/20 hover:bg-purple-500/4 transition-all">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── NASIL ÇALIŞIR ── */}
      <section id="nasil" className="relative z-10 py-24 px-6 border-t border-white/4">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }} className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">3 Adımda Başla</h2>
            <p className="text-gray-400">30 saniyede oyna</p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once:true }}
            className="space-y-6">
            {STEPS.map((s, i) => (
              <motion.div key={i} variants={fadeUp}
                className="flex items-start gap-6 p-6 rounded-2xl border border-white/6 bg-white/2 hover:border-purple-500/20 transition-all">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600/20 to-fuchsia-600/20 border border-purple-500/20 flex items-center justify-center font-black text-xl text-purple-400 flex-shrink-0">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-1">{s.title}</h3>
                  <p className="text-gray-400">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 py-28 px-6 text-center border-t border-white/4">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[300px] bg-purple-600/8 rounded-full blur-3xl" />
        </div>
        <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }} className="relative z-10">
          <h2 className="text-4xl sm:text-6xl font-black mb-6">
            Oynamaya hazır mısın?
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto">
            Hesap oluşturmak 30 saniye sürer. Veya misafir olarak direkt başla.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register"
              className="px-10 py-4 rounded-2xl font-bold text-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 transition-all hover:-translate-y-1 shadow-xl shadow-purple-500/25">
              Kayıt Ol — Ücretsiz
            </Link>
            <Link href="/guest"
              className="px-10 py-4 rounded-2xl font-bold text-xl border border-white/10 bg-white/4 hover:bg-white/8 transition-all hover:-translate-y-1">
              👤 Misafir Gir
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/4 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center text-sm">🎮</div>
            <span className="font-bold">
              <span className="text-white">Party</span>
              <span className="text-purple-400">Verse</span>
            </span>
          </div>
          <p className="text-sm text-gray-600">Gerçek zamanlı sosyal parti oyun platformu</p>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <Link href="/login" className="hover:text-gray-400 transition-colors">Giriş</Link>
            <Link href="/register" className="hover:text-gray-400 transition-colors">Kayıt</Link>
            <Link href="/admin" className="hover:text-gray-400 transition-colors">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
