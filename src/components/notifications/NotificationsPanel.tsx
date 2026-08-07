'use client';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useNotificationsStore } from '@/stores/notifications.store';
import { Notification } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Props { onClose: () => void; }

const NOTIF_ICONS: Record<string, string> = {
  FRIEND_REQUEST: '👥',
  FRIEND_ACCEPTED: '✅',
  ROOM_INVITE: '🎮',
  ACHIEVEMENT: '🏆',
  SYSTEM: '📢',
};

export default function NotificationsPanel({ onClose }: Props) {
  const router = useRouter();
  const { notifications, unreadCount, fetch, markRead, markAllRead, isLoading } = useNotificationsStore();

  useEffect(() => { fetch(); }, []);

  const handleAcceptFriend = async (notif: Notification) => {
    try {
      const requestId = (notif.data as any)?.friendRequestId;
      if (!requestId) return;
      await api.post(`/friends/request/${requestId}/accept`);
      await markRead(notif.id);
      toast.success('Arkadaşlık isteği kabul edildi!');
      fetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'İşlem başarısız');
    }
  };

  const handleDeclineFriend = async (notif: Notification) => {
    try {
      const requestId = (notif.data as any)?.friendRequestId;
      if (!requestId) return;
      await api.delete(`/friends/request/${requestId}`);
      await markRead(notif.id);
      toast('İstek reddedildi');
      fetch();
    } catch {}
  };

  const handleJoinRoom = async (notif: Notification) => {
    try {
      const roomId = (notif.data as any)?.roomId;
      const roomCode = (notif.data as any)?.roomCode;
      if (roomCode) {
        const { data } = await api.post('/rooms/join', { codeOrId: roomCode });
        const room = data.data || data;
        await markRead(notif.id);
        onClose();
        router.push(`/room/${room.id}`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Odaya katılamadın');
    }
  };

  const handleNotifClick = async (notif: Notification) => {
    if (!notif.isRead) await markRead(notif.id);
  };

  return (
    <div className="w-80 sm:w-96 rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">Bildirimler</span>
          {unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-500 text-xs flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAllRead()} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
            Tümünü okundu say
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[420px] overflow-y-auto">
        {isLoading && notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Yükleniyor...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2">🔔</div>
            <p className="text-gray-500 text-sm">Henüz bildirim yok</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {notifications.map((notif) => (
              <motion.div key={notif.id}
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                onClick={() => handleNotifClick(notif)}
                className={`px-4 py-3 border-b border-white/3 transition-all cursor-pointer ${
                  notif.isRead ? 'opacity-60' : 'bg-purple-500/3 hover:bg-white/3'
                }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                    notif.isRead ? 'bg-white/5' : 'bg-purple-500/15'
                  }`}>
                    {NOTIF_ICONS[notif.type] || '📢'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{notif.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-xs text-gray-600 mt-1">{formatRelativeTime(notif.createdAt)}</p>

                    {/* Friend request butonları */}
                    {notif.type === 'FRIEND_REQUEST' && !notif.isRead && (
                      <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleAcceptFriend(notif)}
                          className="flex-1 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold hover:bg-green-500/30 transition-all">
                          ✓ Kabul
                        </button>
                        <button onClick={() => handleDeclineFriend(notif)}
                          className="flex-1 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all">
                          ✕ Reddet
                        </button>
                      </div>
                    )}

                    {/* Oda daveti */}
                    {notif.type === 'ROOM_INVITE' && !notif.isRead && (
                      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleJoinRoom(notif)}
                          className="w-full py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold hover:bg-purple-500/30 transition-all">
                          🎮 Odaya Katıl
                        </button>
                      </div>
                    )}
                  </div>
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0 mt-1" />
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/5 text-center">
        <button onClick={onClose} className="text-xs text-gray-500 hover:text-white transition-colors">
          Kapat
        </button>
      </div>
    </div>
  );
}
