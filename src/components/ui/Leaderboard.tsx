'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { calculateLevelProgress } from '@/lib/utils';

interface LeaderEntry {
  id: string;
  username: string;
  profile: { displayName: string; avatar: string; level: number; xp: number };
  statistics: { gamesWon: number; gamesPlayed: number; winRate: number };
}

const AVATAR_ICONS: Record<string, string> = {
  default:'🧑',warrior:'⚔️',mage:'🔮',rogue:'🗡️',vampire:'🧛',
  werewolf:'🐺',detective:'🔍',doctor:'💉',hunter:'🏹',ghost:'👻',
};

export default function Leaderboard({ limit = 5 }: { limit?: number }) {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'wins' | 'level'>('wins');

  useEffect(() => {
    fetchLeaders();
  }, [filter]);

  const fetchLeaders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/users/leaderboard?sort=${filter}&limit=${limit}`);
      setLeaders(data.data || data);
    } catch {
      // Mock data when backend not available
      setLeaders([]);
    } finally {
      setLoading(false);
    }
  };

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="font-bold text-sm">🏆 Liderler</h3>
        <div className="flex gap-1">
          {(['wins', 'level'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-gray-600 hover:text-gray-400'}`}>
              {f === 'wins' ? 'Galibiyet' : 'Level'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 space-y-2">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-xl">
              <div className="w-6 text-center">
                <div className="w-4 h-4 rounded bg-white/5 animate-pulse mx-auto" />
              </div>
              <div className="w-8 h-8 rounded-xl bg-white/5 animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-3 rounded bg-white/5 animate-pulse w-24" />
                <div className="h-2 rounded bg-white/5 animate-pulse w-16" />
              </div>
            </div>
          ))
        ) : leaders.length === 0 ? (
          <div className="text-center py-6 text-gray-600 text-sm">
            <p>Henüz veri yok</p>
            <p className="text-xs mt-1">Oynadıkça liderliğe yükselersin!</p>
          </div>
        ) : (
          leaders.map((u, i) => {
            const lvl = calculateLevelProgress(u.profile?.xp || 0);
            return (
              <motion.div key={u.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.05 }}
                className={`flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-white/3 ${i < 3 ? 'border border-white/5' : ''}`}>
                <div className="w-6 text-center text-lg">{medals[i] || <span className="text-xs text-gray-600">{i+1}</span>}</div>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 border border-purple-500/20 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {AVATAR_ICONS[u.profile?.avatar] || (u.profile?.displayName||u.username||'?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{u.profile?.displayName || u.username}</p>
                  <p className="text-xs text-gray-600">
                    Lv.{lvl.level} · {filter === 'wins' ? `${u.statistics?.gamesWon || 0} galibiyet` : `${u.profile?.xp || 0} XP`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-purple-400">
                    {filter === 'wins'
                      ? `%${Math.round((u.statistics?.winRate || 0) * 100)}`
                      : `#${i+1}`}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
