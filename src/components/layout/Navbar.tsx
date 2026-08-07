'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationsStore } from '@/stores/notifications.store';
import NotificationsPanel from '@/components/notifications/NotificationsPanel';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { unreadCount, fetch: fetchNotifs } = useNotificationsStore();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) fetchNotifs();
  }, [isAuthenticated]);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
    toast.success('Çıkış yapıldı');
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      const { data } = await api.post('/rooms/join', { codeOrId: joinCode.toUpperCase() });
      const room = data.data || data;
      setShowJoin(false);
      setJoinCode('');
      router.push(`/room/${room.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Oda bulunamadı');
    }
  };

  const navLinks = [
    { href: '/dashboard', label: 'Oyunlar' },
    { href: '/friends', label: 'Arkadaşlar' },
  ];

  const profile = user?.profile;

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#080b14]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center text-sm font-black">
            🎮
          </div>
          <span className="font-black text-lg bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent hidden sm:block">
            PartyVerse
          </span>
        </Link>

        {/* Nav Links */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  pathname === l.href
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}>
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {/* Hızlı kod ile katıl */}
              <div className="relative">
                <button onClick={() => setShowJoin(!showJoin)}
                  className="px-3 py-2 rounded-xl border border-white/10 bg-white/3 hover:bg-white/8 text-xs font-semibold text-gray-300 transition-all hidden sm:flex items-center gap-1.5">
                  🔗 Katıl
                </button>
                <AnimatePresence>
                  {showJoin && (
                    <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      className="absolute right-0 top-12 w-56 rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl p-3 z-50">
                      <form onSubmit={handleJoin} className="flex gap-2">
                        <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                          placeholder="ABC123" maxLength={6} autoFocus
                          className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono tracking-widest placeholder-gray-600 focus:outline-none focus:border-purple-500" />
                        <button type="submit" className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-bold transition-all">→</button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Oda oluştur */}
              <Link href="/room/create"
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-xs font-bold transition-all hidden sm:block">
                + Oda Oluştur
              </Link>

              {/* Bildirimler */}
              <div ref={notifRef} className="relative">
                <button onClick={() => { setShowNotifs(!showNotifs); setShowUserMenu(false); }}
                  className="relative p-2.5 rounded-xl hover:bg-white/5 transition-all">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-xs flex items-center justify-center font-bold border-2 border-[#080b14]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {showNotifs && (
                    <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      className="absolute right-0 top-12 z-50">
                      <NotificationsPanel onClose={() => setShowNotifs(false)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User menu */}
              <div ref={userRef} className="relative">
                <button onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false); }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 transition-all">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-xs font-black">
                    {(profile?.displayName || user?.username || '?')[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium hidden sm:block max-w-[100px] truncate">
                    {profile?.displayName || user?.username}
                  </span>
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      className="absolute right-0 top-12 w-52 rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl overflow-hidden z-50">
                      <div className="p-3 border-b border-white/5">
                        <p className="text-sm font-semibold truncate">{profile?.displayName || user?.username}</p>
                        <p className="text-xs text-gray-500">Seviye {profile?.level || 1} · {profile?.xp || 0} XP</p>
                      </div>
                      <div className="p-1">
                        {[
                          { href: '/profile', icon: '👤', label: 'Profil' },
                          { href: '/friends', icon: '👥', label: 'Arkadaşlar' },
                          { href: '/dashboard', icon: '🎮', label: 'Oyunlar' },
                          { href: '/admin', icon: '⚙️', label: 'Admin Paneli' },
                        ].map((item) => (
                          <Link key={item.href} href={item.href} onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-all">
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                          </Link>
                        ))}
                        <div className="h-px bg-white/5 my-1" />
                        <button onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all">
                          <span>🚪</span>
                          <span>Çıkış Yap</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors">Giriş</Link>
              <Link href="/register" className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 text-sm font-bold transition-all">Kayıt Ol</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
