'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { GAME_TYPES } from '@/types';

export default function CreateRoomPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    gameType: 'vampire-village',
    maxPlayers: 8,
    isPrivate: false,
    password: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) { router.push('/login'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/rooms', {
        name: form.name,
        gameType: form.gameType,
        maxPlayers: form.maxPlayers,
        isPrivate: form.isPrivate,
        password: form.isPrivate && form.password ? form.password : undefined,
      });
      const room = data.data || data;
      toast.success('Oda oluşturuldu!');
      router.push(`/room/${room.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Oda oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b14] text-white flex items-center justify-center px-4 py-8">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-purple-600/8 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-lg">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-black">Oda Oluştur</h1>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/3 p-8">
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Oda Adı *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Efsane Gece Oyunu"
                minLength={3} maxLength={40}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Oyun Seç</label>
              <div className="grid grid-cols-2 gap-2">
                {GAME_TYPES.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    disabled={!game.available}
                    onClick={() => game.available && setForm({ ...form, gameType: game.id })}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      form.gameType === game.id
                        ? 'border-purple-500 bg-purple-500/15 text-white'
                        : game.available
                        ? 'border-white/8 bg-white/3 text-gray-300 hover:border-white/20'
                        : 'border-white/3 bg-white/1 text-gray-600 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span className="text-xl">{game.icon}</span>
                    <div>
                      <div className="text-sm font-semibold">{game.name}</div>
                      {!game.available && <div className="text-xs text-gray-600">Yakında</div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Maksimum Oyuncu: <span className="text-purple-400 font-bold">{form.maxPlayers}</span>
              </label>
              <input
                type="range"
                min={4} max={16}
                value={form.maxPlayers}
                onChange={(e) => setForm({ ...form, maxPlayers: Number(e.target.value) })}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>4</span><span>16</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-white/3">
              <div>
                <div className="font-medium text-sm">Özel Oda</div>
                <div className="text-xs text-gray-500">Sadece davet/kod ile katılınabilir</div>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, isPrivate: !form.isPrivate })}
                className={`relative w-12 h-6 rounded-full transition-all ${form.isPrivate ? 'bg-purple-500' : 'bg-white/10'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.isPrivate ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {form.isPrivate && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Oda Şifresi (opsiyonel)</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Boş bırakılabilir"
                  maxLength={32}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !form.name.trim()}
              className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-purple-500/20 mt-2"
            >
              {loading ? 'Oluşturuluyor...' : '🎮 Odayı Oluştur'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
