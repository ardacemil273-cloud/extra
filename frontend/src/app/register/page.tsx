'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Şifre en az 8 karakter olmalı'); return; }
    try {
      await register(form.username, form.email, form.password, form.displayName || form.username);
      toast.success('Hoş geldin! 🎮');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Kayıt başarısız');
    }
  };

  return (
    <div className="min-h-screen bg-[#080b14] flex items-center justify-center px-4 py-8">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center text-xl">🎮</div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">PartyVerse</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">Hesap oluştur</h1>
          <p className="text-gray-400 mt-1 text-sm">Ücretsiz, 30 saniyede hazır</p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Kullanıcı Adı *</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="havalı_kullanıcı"
                minLength={3} maxLength={20}
                pattern="[a-zA-Z0-9_]+"
                title="Sadece harf, rakam ve _ kullanabilirsiniz"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                required
              />
              <p className="text-xs text-gray-600 mt-1">3-20 karakter, harf/rakam/_</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Görünen Ad</label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="Oyun içinde görünecek isim"
                maxLength={50}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">E-posta *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Şifre *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="En az 8 karakter"
                minLength={8}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                required
              />
              <p className="text-xs text-gray-600 mt-1">En az 1 büyük harf, 1 küçük harf, 1 rakam</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-purple-500/20 mt-2"
            >
              {isLoading ? 'Oluşturuluyor...' : 'Hesap Oluştur →'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/guest" className="w-full block py-3 rounded-xl font-medium border border-white/10 bg-white/3 hover:bg-white/8 transition-all text-sm text-gray-400">
              👤 Kayıt olmadan misafir olarak gir
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Zaten hesabın var mı?{' '}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">Giriş yap</Link>
        </p>
      </motion.div>
    </div>
  );
}
