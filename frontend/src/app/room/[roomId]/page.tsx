"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/auth.store";
import { useRoomStore } from "@/stores/room.store";
import { getRoomSocket, connectRoomSocket } from "@/lib/socket";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Room, ChatMessage, GAME_TYPES } from "@/types";
import { copyToClipboard } from "@/lib/utils";

export default function LobbyPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { currentRoom, setRoom, chatMessages, addChatMessage, setConnected } =
    useRoomStore();
  const [chatInput, setChatInput] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [allReady, setAllReady] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef(getRoomSocket());

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    loadRoom();
    setupSocket();
    return () => {
      socketRef.current.off();
      socketRef.current.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const loadRoom = async () => {
    try {
      const { data } = await api.get(`/rooms/${roomId}`);
      setRoom(data.data || data);
    } catch {
      toast.error("Oda bulunamadı");
      router.push("/dashboard");
    }
  };

  const setupSocket = () => {
    const socket = socketRef.current;
    connectRoomSocket();
    socket.emit("room:join", { roomId });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("room:updated", (room: Room) => {
      setRoom(room);
      const mePlayer = room.players.find((p) => p.userId === user?.id);
      if (mePlayer) setIsReady(mePlayer.isReady);
    });
    socket.on("room:joined", (room: Room) => setRoom(room));
    socket.on("room:kicked", () => {
      toast.error("Odadan atıldınız");
      router.push("/dashboard");
    });
    socket.on("room:closed", () => {
      toast("Oda kapandı");
      router.push("/dashboard");
    });
    socket.on("room:all-ready", () => setAllReady(true));
    socket.on("lobby:chat", (msg: ChatMessage) => addChatMessage(msg));
    socket.on("game:started", ({ matchId }: { matchId: string }) => {
      router.push(`/game/${roomId}`);
    });
    socket.on("room:error", ({ message }: { message: string }) =>
      toast.error(message),
    );
  };

  const handleReady = () => {
    const newReady = !isReady;
    setIsReady(newReady);
    socketRef.current.emit("room:ready", { roomId, isReady: newReady });
  };

  const handleStartGame = () => {
    if (!currentRoom?.gameType) {
      toast.error("Önce oyun seçin");
      return;
    }
    socketRef.current.emit("game:start", {
      roomId,
      gameType: currentRoom.gameType,
    });
  };

  const handleKick = (targetUserId: string) => {
    socketRef.current.emit("room:kick", { roomId, targetUserId });
  };

  const handleSelectGame = (gameType: string) => {
    socketRef.current.emit("room:select-game", { roomId, gameType });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socketRef.current.emit("lobby:chat", { roomId, message: chatInput });
    setChatInput("");
  };

  const handleCopyCode = () => {
    if (currentRoom?.code) {
      copyToClipboard(currentRoom.code);
      toast.success("Kod kopyalandı!");
    }
  };

  const handleCopyLink = () => {
    copyToClipboard(
      `${window.location.origin}/room/join?code=${currentRoom?.code}`,
    );
    toast.success("Link kopyalandı!");
  };

  const isHost = currentRoom?.hostId === user?.id;
  const myPlayer = currentRoom?.players.find((p) => p.userId === user?.id);
  const readyCount = currentRoom?.players.filter((p) => p.isReady).length || 0;
  const totalCount = currentRoom?.players.length || 0;

  return (
    <div className="min-h-screen bg-[#080b14] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-purple-600/6 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#080b14]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                socketRef.current.emit("room:leave", { roomId });
                router.push("/dashboard");
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 hover:border-red-500/20 border border-white/5 transition-all"
            >
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <h1 className="font-bold">
                {currentRoom?.name || "Yükleniyor..."}
              </h1>
              <p className="text-xs text-gray-500">
                {totalCount}/{currentRoom?.maxPlayers || "?"} oyuncu
              </p>
            </div>
          </div>

          {/* Room code */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/3">
              <span className="text-xs text-gray-500">Kod:</span>
              <span className="font-black tracking-widest text-purple-400 font-mono">
                {currentRoom?.code}
              </span>
              <button
                onClick={handleCopyCode}
                className="text-gray-500 hover:text-white transition-colors"
                title="Kopyala"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-xl border border-white/8 bg-white/3 hover:bg-white/8 text-xs transition-all"
            >
              🔗 Link
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Players */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Oyuncular</h2>
              <span className="text-sm text-gray-500">
                {readyCount}/{totalCount} hazır
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {currentRoom?.players.map((rp, i) => (
                <motion.div
                  key={rp.userId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`relative rounded-2xl border p-4 text-center transition-all ${
                    rp.isReady
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-white/8 bg-white/3"
                  }`}
                >
                  {rp.isHost && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400">
                      Host
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 border border-purple-500/20 flex items-center justify-center text-xl font-black mx-auto mb-2">
                    {(rp.user?.profile?.displayName ||
                      rp.user?.username ||
                      "?")[0].toUpperCase()}
                  </div>
                  <div className="text-sm font-semibold truncate">
                    {rp.user?.profile?.displayName || rp.user?.username}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Lv.{rp.user?.profile?.level || 1}
                  </div>
                  <div
                    className={`mt-2 text-xs font-semibold ${rp.isReady ? "text-green-400" : "text-gray-500"}`}
                  >
                    {rp.isReady ? "✓ Hazır" : "Bekleniyor"}
                  </div>

                  {isHost && rp.userId !== user?.id && (
                    <button
                      onClick={() => handleKick(rp.userId)}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                      title="At"
                    >
                      ×
                    </button>
                  )}
                </motion.div>
              ))}

              {/* Empty slots */}
              {Array.from({
                length: Math.max(
                  0,
                  (currentRoom?.maxPlayers || 8) -
                    (currentRoom?.players.length || 0),
                ),
              })
                .slice(0, 4)
                .map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="rounded-2xl border border-dashed border-white/5 p-4 flex items-center justify-center text-gray-700 text-sm"
                  >
                    Boş
                  </div>
                ))}
            </div>

            {/* Game selection (host only) */}
            {isHost && (
              <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
                <h3 className="font-semibold mb-3 text-gray-300">Oyun Seç</h3>
                <div className="flex flex-wrap gap-2">
                  {GAME_TYPES.filter((g) => g.available).map((game) => (
                    <button
                      key={game.id}
                      onClick={() => handleSelectGame(game.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                        currentRoom?.gameType === game.id
                          ? "border-purple-500 bg-purple-500/20 text-purple-300"
                          : "border-white/10 bg-white/3 text-gray-400 hover:border-white/20"
                      }`}
                    >
                      {game.icon} {game.name}
                    </button>
                  ))}
                </div>
                {currentRoom?.gameType && (
                  <p className="text-xs text-gray-500 mt-2">
                    Seçili:{" "}
                    {
                      GAME_TYPES.find((g) => g.id === currentRoom.gameType)
                        ?.name
                    }
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleReady}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                  isReady
                    ? "bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30"
                    : "bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white shadow-lg shadow-green-500/20"
                }`}
              >
                {isReady ? "✓ Hazırım" : "Hazır"}
              </button>

              {isHost && (
                <button
                  onClick={handleStartGame}
                  disabled={
                    !currentRoom?.gameType ||
                    readyCount < totalCount ||
                    totalCount < 4
                  }
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-purple-500/20"
                >
                  {!currentRoom?.gameType
                    ? "⚠ Oyun Seç"
                    : readyCount < totalCount
                      ? `⏳ ${readyCount}/${totalCount} Hazır`
                      : totalCount < 4
                        ? "⚠ Min 4 Oyuncu"
                        : "🎮 Oyunu Başlat"}
                </button>
              )}
            </div>
          </div>

          {/* Chat */}
          <div
            className="lg:col-span-1 flex flex-col rounded-2xl border border-white/8 bg-white/3 overflow-hidden"
            style={{ height: "70vh" }}
          >
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
              <span className="text-sm font-semibold">💬 Sohbet</span>
              <span className="text-xs text-gray-600">
                {chatMessages.length} mesaj
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {chatMessages.length === 0 && (
                <p className="text-center text-gray-600 text-xs mt-8">
                  Henüz mesaj yok. Merhaba de! 👋
                </p>
              )}
              <AnimatePresence initial={false}>
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 ${msg.userId === user?.id ? "flex-row-reverse" : ""}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/40 to-fuchsia-500/40 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {(msg.displayName ||
                        msg.username ||
                        "?")[0].toUpperCase()}
                    </div>
                    <div
                      className={`max-w-[75%] ${msg.userId === user?.id ? "items-end" : "items-start"} flex flex-col gap-0.5`}
                    >
                      <span className="text-xs text-gray-600">
                        {msg.displayName || msg.username}
                      </span>
                      <div
                        className={`px-3 py-2 rounded-xl text-sm ${
                          msg.userId === user?.id
                            ? "bg-purple-600/30 text-purple-100"
                            : "bg-white/5 text-gray-200"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            <form
              onSubmit={handleSendChat}
              className="p-3 border-t border-white/5 flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Mesaj yaz..."
                maxLength={300}
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm transition-all"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm transition-all active:scale-95"
              >
                ↑
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
