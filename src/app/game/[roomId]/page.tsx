'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import VampireVillageGame from '@/components/games/vampire-village/VampireVillageGame';
import FarmTogetherGame from '@/components/games/farm-together/FarmTogetherGame';
import FashionStarGame from '@/components/games/fashion-star/FashionStarGame';
import CafeRushGame from '@/components/games/cafe-rush/CafeRushGame';
import BarbieDressupGame from '@/components/games/barbie-dressup/BarbieDressupGame';

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [gameType, setGameType] = useState<string | null>(null);
  const [players, setPlayers] = useState<Array<{ userId: string; displayName: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    const load = async () => {
      try {
        const { data } = await api.get(`/rooms/${roomId}`);
        const room = data.data || data;
        setGameType(room.gameType);
        setPlayers((room.players || []).map((p: any) => ({
          userId: p.userId,
          displayName: p.user?.profile?.displayName || p.user?.username || '?',
        })));
      } catch {
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [roomId, router, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen pastel-bg flex flex-col items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="text-6xl">🎲</motion.div>
        <p className="mt-4 text-[#a08fb0] font-bold">Oyun yükleniyor...</p>
      </div>
    );
  }

  if (!user?.id) return null;

  switch (gameType) {
    case 'vampire-village':
      return <VampireVillageGame roomId={roomId} myUserId={user.id} />;
    case 'farm-together':
      return <FarmTogetherGame roomId={roomId} myUserId={user.id} />;
    case 'fashion-star':
      return <FashionStarGame roomId={roomId} myUserId={user.id} players={players} />;
    case 'cafe-rush':
      return <CafeRushGame roomId={roomId} myUserId={user.id} />;
    case 'barbie-dreamhouse':
      return <BarbieDressupGame roomId={roomId} myUserId={user.id} players={players} />;
    default:
      return (
        <div className="min-h-screen pastel-bg flex flex-col items-center justify-center px-4">
          <div className="text-6xl mb-4">🧸</div>
          <h1 className="text-2xl font-black pastel-shimmer mb-2">Oyun Bulunamadı</h1>
          <p className="text-[#a08fb0] mb-6">Bu oda için seçilmiş bir oyun yok veya oyun desteklenmiyor.</p>
          <button onClick={() => router.push('/dashboard')}
            className="px-8 py-3 rounded-2xl font-bold pastel-btn">🏠 Lobiye Dön</button>
        </div>
      );
  }
}
