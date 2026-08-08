'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGameSocket, connectGameSocket } from '@/lib/socket';
import { CafeState, Order, Recipe, RecipeId } from '@/types';
import { sounds } from '@/lib/sounds';
import toast from 'react-hot-toast';
import GameOverPastel from '@/components/games/GameOverPastel';

const RECIPES: Record<RecipeId, Recipe> = {
  'strawberry-cake': { id: 'strawberry-cake', name: 'Çilekli Kek', emoji: '🍰', steps: ['mix', 'bake'], coins: 20 },
  burger: { id: 'burger', name: 'Burger', emoji: '🍔', steps: ['chop', 'bake'], coins: 20 },
  salad: { id: 'salad', name: 'Salata', emoji: '🥗', steps: ['chop', 'mix'], coins: 18 },
  pancake: { id: 'pancake', name: 'Pankek', emoji: '🥞', steps: ['mix', 'bake'], coins: 22 },
  smoothie: { id: 'smoothie', name: 'Smoothie', emoji: '🥤', steps: ['chop', 'mix'], coins: 18 },
};

const STATION_LABEL: Record<string, string> = {
  chop: '🔪 Doğra',
  bake: '🍳 Pişir',
  mix: '🥣 Karıştır',
};

const RULES = [
  '🍰 Siparişleri yetiştir! 4 dakikada 15 sipariş tamamlayın.',
  '📋 Sipariş kartları üstte gelir. Birini seç (tıkla-üstlen).',
  '🔪 Ürünü hazırlamak için gereken istasyonlara tıkla (doğra/pişir/karıştır).',
  '⏱ Her sipariş 30 saniyede süresi doluyor — kırmızıya dönünce acele et!',
  '🎯 Bu bir TAKIM oyunu — hepiniz birlikte kazanırsınız!',
];

interface Props {
  roomId: string;
  myUserId: string;
}

export default function CafeRushGame({ roomId, myUserId }: Props) {
  const socketRef = useRef(getGameSocket());
  const [cafe, setCafe] = useState<CafeState | null>(null);
  const [showRules, setShowRules] = useState(true);
  const [myOrderId, setMyOrderId] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(240);

  const now = Date.now();

  useEffect(() => {
    connectGameSocket();
    const socket = socketRef.current;
    socket.emit('game:join', { roomId });

    socket.on('cafe:state-update', (s: CafeState) => {
      setCafe(s);
      if (s.remaining !== undefined) setTimeLeft(s.remaining);
    });
    socket.on('cafe:tick', ({ remaining }: any) => setTimeLeft(remaining));
    socket.on('cafe:new-order', (order: Order) => {
      sounds.notification();
      toast('Yeni sipariş geldi!', { icon: '📋' });
    });
    socket.on('cafe:served', ({ orderId, userId }: any) => {
      sounds.success();
      if (userId === myUserId) setMyOrderId(null);
    });
    socket.on('cafe:sound', ({ type }: any) => {
      if (type === 'serve') sounds.success();
    });
    socket.on('game:over', (result: any) => {
      setGameOver(result);
    });

    return () => { socket.off(); };
  }, [roomId, myUserId]);

  const claimOrder = (order: Order) => {
    if (order.status !== 'ACTIVE') return;
    setMyOrderId(order.id);
    socketRef.current.emit('cafe:action', { roomId, action: 'claim', orderId: order.id });
    sounds.click();
  };

  const makeOrder = (order: Order) => {
    if (order.assignedTo !== myUserId) { toast('Önce siparişi üstlen!', { icon: '⚠️' }); return; }
    socketRef.current.emit('cafe:action', { roomId, action: 'advance', orderId: order.id });
    sounds.voteClick();
  };

  if (gameOver) {
    return (
      <GameOverPastel
        roomId={roomId}
        emoji="🍰"
        win={!!gameOver.won}
        winnerText={gameOver.won ? 'MUTFAK PATLADI!' : 'SÜRE DOLDU'}
        subtitle={`${gameOver.served} / ${gameOver.goal} sipariş hazırlandı`}
        narrator={gameOver.narrator}
        players={gameOver.players}
      />
    );
  }

  return (
    <div className="min-h-screen pastel-bg text-[#5a4a6a]">
      {/* Rules modal */}
      <AnimatePresence>
        {showRules && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: .9 }} animate={{ scale: 1 }}
              className="pastel-card rounded-3xl max-w-md w-full p-6">
              <div className="text-center mb-4">
                <div className="text-6xl mb-2 animate-bounce-soft">🍰</div>
                <h2 className="text-2xl font-black pastel-shimmer">Cafe Rush</h2>
                <p className="text-sm text-[#a08fb0] mt-1">Mutfak kaosuna hazır mısın?</p>
              </div>
              <ul className="space-y-2.5 mb-6">
                {RULES.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#7a6a8a]">
                    <span className="text-[#b39ddb] flex-shrink-0">✦</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => { setShowRules(false); sounds.click(); }}
                className="w-full py-3 rounded-2xl font-bold pastel-btn">🍽 Başla!</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-[#ffc1e3]/40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍰</span>
            <span className="font-black pastel-shimmer">Cafe Rush</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="pastel-chip px-3 py-1.5 rounded-full text-sm font-bold">
              ✅ <span className="text-[#7ac070]">{cafe?.served || 0}</span> / {cafe?.goal || 15}
            </div>
            <div className={`pastel-chip px-3 py-1.5 rounded-full text-sm font-bold ${timeLeft <= 30 ? '!bg-[#ff6b6b] !text-white animate-pulse' : ''}`}>
              ⏱ {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 pb-3">
          <div className="h-2.5 rounded-full bg-[#ffe4ec] overflow-hidden">
            <div className="h-full rounded-full transition-all bg-gradient-to-r from-[#ffb6c1] to-[#c3a6e0]"
              style={{ width: `${Math.min(100, ((cafe?.served||0)/(cafe?.goal||15))*100)}%` }} />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Order tickets (conveyor top, horizontal scroll) */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#b39ddb] mb-2">📋 Siparişler</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {cafe?.orders.length === 0 && (
              <div className="pastel-card rounded-2xl p-6 text-center text-sm text-[#a08fb0] min-w-[200px]">
                Sipariş bekleniyor...
              </div>
            )}
            {cafe?.orders.map(order => {
              const recipe = RECIPES[order.recipe];
              const expiring = now > order.expiresAt - 10000;
              const isMine = order.assignedTo === myUserId;
              return (
                <button key={order.id} onClick={() => isMine ? makeOrder(order) : claimOrder(order)}
                  className={`flex-shrink-0 rounded-2xl p-3 border transition-all min-w-[140px] relative ${
                    order.status === 'ACTIVE'
                      ? expiring
                        ? 'bg-[#ff6b6b]/20 border-[#ff6b6b] animate-pulse'
                        : 'bg-white/80 border-[#ffc1e3] hover:border-[#b39ddb]'
                      : 'bg-gray-100/70 border-gray-200 opacity-60'
                  }`}>
                  <div className="text-3xl mb-1">{recipe.emoji}</div>
                  <p className="text-xs font-bold">{recipe.name}</p>
                  {/* steps progress */}
                  <div className="flex gap-1 mt-2">
                    {recipe.steps.map((s, i) => (
                      <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        i <= order.stepIndex - 1 ? 'bg-[#98fb98] text-green-700' : 'bg-white/70 text-[#a08fb0]'
                      }`}>
                        {STATION_LABEL[s]}
                      </span>
                    ))}
                  </div>
                  <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#ffb6c1] text-white text-xs flex items-center justify-center font-bold">
                    {expiring ? '⚠️' : order.status === 'COMPLETE' ? '✓' : isMine ? '👩‍🍳' : order.assignedTo ? '🧑‍🍳' : '+'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Kitchen stations */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#b39ddb] mb-2">🍳 Mutfak İstasyonları</p>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(STATION_LABEL).map(([key, label]) => (
              <div key={key} className="pastel-card rounded-3xl p-5 flex flex-col items-center justify-center min-h-[110px]">
                <span className="text-4xl mb-2">{label.split(' ')[0]}</span>
                <span className="text-sm font-bold">{label}</span>
                <span className="text-[10px] text-[#a08fb0] mt-1">Ürünün hazır olunca tıkla</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory bottom */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#b39ddb] mb-2">🧺 Envanter & Aktif Sipariş</p>
          <div className="pastel-card rounded-3xl p-4">
            {myOrderId && cafe?.orders.find(o => o.id === myOrderId) ? (
              <div className="flex items-center gap-3">
                <span className="text-4xl">{RECIPES[cafe.orders.find(o => o.id === myOrderId)!.recipe].emoji}</span>
                <div>
                  <p className="text-sm font-bold">{RECIPES[cafe.orders.find(o => o.id === myOrderId)!.recipe].name}</p>
                  <p className="text-xs text-[#a08fb0]">Hazırladığın sipariş — istasyona tıkla ilerlet</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#a08fb0] text-center py-2">
                Bir sipariş üstlenmek için üstteki kartlara dokun! 👆
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
