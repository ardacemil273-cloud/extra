"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/auth.store";
import { useGameStore } from "@/stores/game.store";
import { getGameSocket, connectGameSocket } from "@/lib/socket";
import { ROLE_CONFIG, GamePlayer, VampireRole } from "@/types";
import toast from "react-hot-toast";

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    gameState,
    myRole,
    myTeam,
    isMyTurn,
    turnTargets,
    turnRole,
    turnDuration,
    messages,
    narratorMessages,
    nightActiveRole,
    morningDeaths,
    eliminatedPlayer,
    gameResult,
    setGameState,
    setMyRole,
    setMyTurn,
    addChatMessage,
    addNarratorMessage,
    setNightActiveRole,
    setMorningDeaths,
    setEliminatedPlayer,
    setGameResult,
    setConnected,
    reset,
  } = useGameStore();

  const [chatInput, setChatInput] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef(getGameSocket());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    connectGameSocket();
    const socket = socketRef.current;
    socket.emit("game:join", { roomId });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("game:state", (s) => setGameState(s));
    socket.on("game:started", () => toast("🎮 Oyun başladı!"));
    socket.on(
      "game:role-assigned",
      ({
        userId,
        role,
        team,
      }: {
        userId: string;
        role: VampireRole;
        team: string;
      }) => {
        if (userId === user?.id) {
          setMyRole(role, team);
          toast(
            `Rolün: ${ROLE_CONFIG[role]?.name || role} ${ROLE_CONFIG[role]?.icon || ""}`,
          );
        }
      },
    );
    socket.on("game:phase-change", ({ phase, narrator, duration }: any) => {
      setGameState({ ...(gameState as any), phase });
      if (narrator)
        addNarratorMessage({
          id: Date.now().toString(),
          message: narrator,
          type: phase,
          timestamp: Date.now(),
        });
      if (duration) startTimer(duration);
    });
    socket.on("game:narrator", ({ message, type }: any) => {
      addNarratorMessage({
        id: Date.now().toString(),
        message,
        type,
        timestamp: Date.now(),
      });
    });
    socket.on("game:night-role", ({ activeRole, narrator }: any) => {
      setNightActiveRole(activeRole);
      if (narrator)
        addNarratorMessage({
          id: Date.now().toString(),
          message: narrator,
          type: "night",
          timestamp: Date.now(),
        });
    });
    socket.on("game:your-turn", ({ role, targets, duration }: any) => {
      setMyTurn(true, targets, role, duration);
      startTimer(duration);
      toast(
        `🎯 Senin sıran! ${ROLE_CONFIG[role as VampireRole]?.name || role} aksiyonu`,
      );
    });
    socket.on(
      "game:detective-result",
      ({ targetName, result, narrator }: any) => {
        addNarratorMessage({
          id: Date.now().toString(),
          message: narrator,
          type: "detective",
          timestamp: Date.now(),
        });
        toast(
          result === "SUSPICIOUS"
            ? `🚨 ${targetName} ŞÜPHELİ!`
            : `✅ ${targetName} masum`,
        );
      },
    );
    socket.on(
      "game:morning",
      ({ deaths, narrator, deathAnnouncement }: any) => {
        setMorningDeaths(deaths);
        setNightActiveRole(null);
        setMyTurn(false);
        addNarratorMessage({
          id: Date.now().toString(),
          message: narrator,
          type: "morning",
          timestamp: Date.now(),
        });
        if (deathAnnouncement)
          addNarratorMessage({
            id: (Date.now() + 1).toString(),
            message: deathAnnouncement,
            type: "death",
            timestamp: Date.now() + 1,
          });
      },
    );
    socket.on("game:vote-update", ({ players }: any) => {
      if (gameState)
        setGameState({
          ...gameState,
          players: { ...gameState.players, ...players },
        });
    });
    socket.on("game:vote-result", ({ eliminated, narrator }: any) => {
      setEliminatedPlayer(eliminated);
      if (narrator)
        addNarratorMessage({
          id: Date.now().toString(),
          message: narrator,
          type: "vote_result",
          timestamp: Date.now(),
        });
    });
    socket.on("game:over", (result: any) => {
      setGameResult(result);
      if (result.narrator)
        addNarratorMessage({
          id: Date.now().toString(),
          message: result.narrator,
          type: "game_over",
          timestamp: Date.now(),
        });
    });
    socket.on("game:chat", (msg: any) => addChatMessage(msg));
    socket.on("game:error", ({ message }: any) => toast.error(message));

    return () => {
      socket.off();
      if (timerRef.current) clearInterval(timerRef.current);
      reset();
    };
  }, [roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startTimer = (duration: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(duration);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const handleAction = () => {
    if (!selectedTarget || !turnRole) return;
    const actionMap: Record<string, string> = {
      VAMPIRE: "VAMPIRE_KILL",
      DOCTOR: "DOCTOR_SAVE",
      DETECTIVE: "DETECTIVE_INVESTIGATE",
      HUNTER: "HUNTER_WATCH",
    };
    socketRef.current.emit("game:action", {
      roomId,
      action: actionMap[turnRole],
      targetId: selectedTarget,
    });
    setMyTurn(false);
    setSelectedTarget(null);
    toast.success("Aksiyon kullanıldı!");
  };

  const handleVote = (targetId: string) => {
    socketRef.current.emit("game:vote", { roomId, targetId });
    toast("Oy kullanıldı");
  };

  const handleChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socketRef.current.emit("game:chat", { roomId, message: chatInput });
    setChatInput("");
  };

  const isNight = gameState?.phase === "NIGHT";
  const isDay = [
    "DAY_ANNOUNCEMENT",
    "DAY_DISCUSSION",
    "DAY_VOTING",
    "VOTE_RESULT",
  ].includes(gameState?.phase || "");
  const isVoting = gameState?.phase === "DAY_VOTING";
  const isDiscussion = gameState?.phase === "DAY_DISCUSSION";
  const isGameOver = gameState?.phase === "GAME_OVER";
  const myPlayer = gameState?.players[user?.id || ""];
  const alivePlayers = gameState
    ? Object.values(gameState.players).filter((p) => p.status === "ALIVE")
    : [];
  const roleInfo = myRole ? ROLE_CONFIG[myRole] : null;

  if (isGameOver && gameResult) {
    const iWon = myPlayer?.team === gameResult.winnerTeam;
    return (
      <div className="min-h-screen bg-[#080b14] text-white flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-lg"
        >
          <div className="text-8xl mb-6">{iWon ? "🏆" : "💀"}</div>
          <h1
            className={`text-5xl font-black mb-4 ${iWon ? "text-yellow-400" : "text-red-400"}`}
          >
            {iWon ? "KAZANDIN!" : "KAYBETTİN!"}
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            {gameResult.winnerTeam === "VILLAGERS"
              ? "🧑 Köylüler kazandı!"
              : "🧛 Vampirler kazandı!"}
          </p>
          <div className="mt-6 p-4 rounded-2xl border border-white/8 bg-white/3 text-left mb-8">
            <p className="text-sm text-gray-400 italic">
              "{gameResult.narrator}"
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-8">
            {Object.entries(gameResult.allRoles || {}).map(
              ([uid, { role }]) => {
                const p = gameState?.players[uid];
                if (!p) return null;
                const r = ROLE_CONFIG[role as VampireRole];
                return (
                  <div
                    key={uid}
                    className="flex items-center gap-2 p-2 rounded-xl bg-white/3 border border-white/5"
                  >
                    <span className="text-xl">{r?.icon || "❓"}</span>
                    <span className="text-sm truncate">{p.displayName}</span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {r?.name || role}
                    </span>
                  </div>
                );
              },
            )}
          </div>
          <button
            onClick={() => router.push(`/room/${roomId}`)}
            className="px-8 py-4 rounded-2xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 transition-all"
          >
            🔄 Tekrar Oyna
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen text-white transition-all duration-1000 ${isNight ? "bg-[#020408]" : "bg-[#080b14]"}`}
    >
      {/* Night overlay effect */}
      <AnimatePresence>
        {isNight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gradient-to-b from-[#020408] to-[#0a0614] pointer-events-none z-0"
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 0%, rgba(139,0,0,0.08) 0%, transparent 60%)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header
        className={`relative z-20 border-b ${isNight ? "border-red-900/30 bg-[#020408]/95" : "border-white/5 bg-[#080b14]/90"} backdrop-blur-xl sticky top-0`}
      >
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-black text-sm">
              {isNight ? "🌙 GECE" : "☀️ GÜNDÜZ"}
            </span>
            {gameState?.round && (
              <span className="text-xs text-gray-500">
                Tur {gameState.round}
              </span>
            )}
          </div>

          {/* Phase */}
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-3 py-1 rounded-full border font-medium ${
                isNight
                  ? "bg-red-900/20 border-red-700/30 text-red-400"
                  : isVoting
                    ? "bg-orange-900/20 border-orange-700/30 text-orange-400"
                    : "bg-blue-900/20 border-blue-700/30 text-blue-400"
              }`}
            >
              {gameState?.phase === "NIGHT"
                ? "Gece"
                : gameState?.phase === "DAY_DISCUSSION"
                  ? "Tartışma"
                  : gameState?.phase === "DAY_VOTING"
                    ? "Oylama"
                    : gameState?.phase === "DAY_ANNOUNCEMENT"
                      ? "Sabah"
                      : gameState?.phase || "Bekleniyor"}
            </span>
            {timeLeft > 0 && (
              <span
                className={`font-mono text-sm font-bold ${timeLeft <= 10 ? "text-red-400 animate-pulse" : "text-gray-300"}`}
              >
                {Math.floor(timeLeft / 60)}:
                {String(timeLeft % 60).padStart(2, "0")}
              </span>
            )}
          </div>

          {/* My role */}
          {roleInfo && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm ${
                myRole === "VAMPIRE"
                  ? "bg-red-900/20 border-red-700/30 text-red-400"
                  : myRole === "DOCTOR"
                    ? "bg-green-900/20 border-green-700/30 text-green-400"
                    : myRole === "DETECTIVE"
                      ? "bg-blue-900/20 border-blue-700/30 text-blue-400"
                      : "bg-white/5 border-white/10 text-gray-300"
              }`}
            >
              <span>{roleInfo.icon}</span>
              <span className="font-semibold">{roleInfo.name}</span>
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main game area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Narrator */}
            <AnimatePresence mode="popLayout">
              {narratorMessages.slice(-1).map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-2xl border p-4 ${
                    msg.type === "death" || msg.type === "night"
                      ? "border-red-700/30 bg-red-900/10"
                      : msg.type === "game_over"
                        ? "border-yellow-600/30 bg-yellow-900/10"
                        : "border-purple-700/30 bg-purple-900/10"
                  }`}
                >
                  <p
                    className={`text-sm italic leading-relaxed ${
                      msg.type === "death"
                        ? "text-red-300"
                        : msg.type === "game_over"
                          ? "text-yellow-300"
                          : "text-purple-200"
                    }`}
                  >
                    🎭 "{msg.message}"
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Night: my turn action */}
            <AnimatePresence>
              {isMyTurn && isNight && turnTargets.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-red-500/30 bg-red-900/10 p-5"
                >
                  <p className="font-bold text-red-300 mb-1">
                    {ROLE_CONFIG[turnRole!]?.icon} Senin Sıran —{" "}
                    {ROLE_CONFIG[turnRole!]?.name}
                  </p>
                  <p className="text-sm text-gray-400 mb-4">
                    {ROLE_CONFIG[turnRole!]?.description}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {turnTargets.map((t) => (
                      <button
                        key={t.userId}
                        onClick={() => setSelectedTarget(t.userId)}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                          selectedTarget === t.userId
                            ? "border-red-500 bg-red-500/20 text-red-300"
                            : "border-white/10 bg-white/3 hover:border-white/20 text-gray-300"
                        }`}
                      >
                        <div className="text-xl mb-1">
                          {(t.displayName || "?")[0].toUpperCase()}
                        </div>
                        <div className="truncate">{t.displayName}</div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleAction}
                    disabled={!selectedTarget}
                    className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 disabled:opacity-40 transition-all active:scale-95"
                  >
                    ✓ Onayla
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Night: passive (not your turn) */}
            {isNight && !isMyTurn && (
              <div className="rounded-2xl border border-white/5 bg-black/40 p-8 text-center">
                <div className="text-5xl mb-4 animate-pulse">🌙</div>
                <p className="text-gray-500">
                  {nightActiveRole
                    ? `${ROLE_CONFIG[nightActiveRole as VampireRole]?.icon || "👁"} ${ROLE_CONFIG[nightActiveRole as VampireRole]?.name || nightActiveRole} karar veriyor...`
                    : "Gece devam ediyor... Bekle"}
                </p>
              </div>
            )}

            {/* Players grid */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">
                Oyuncular ({alivePlayers.length} hayatta)
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {gameState &&
                  Object.values(gameState.players).map((p: GamePlayer) => (
                    <motion.button
                      key={p.userId}
                      onClick={() =>
                        isVoting &&
                        p.status === "ALIVE" &&
                        p.userId !== user?.id &&
                        handleVote(p.userId)
                      }
                      className={`relative rounded-xl border p-3 text-center transition-all ${
                        p.status === "DEAD"
                          ? "opacity-30 border-white/3 bg-white/1 cursor-not-allowed"
                          : isVoting && p.userId !== user?.id
                            ? "border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/15 cursor-pointer hover:border-orange-500/50"
                            : "border-white/8 bg-white/3"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl mx-auto mb-1.5 flex items-center justify-center font-black text-lg ${
                          p.status === "DEAD"
                            ? "bg-gray-800"
                            : "bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 border border-purple-500/20"
                        }`}
                      >
                        {p.status === "DEAD"
                          ? "💀"
                          : (p.displayName || "?")[0].toUpperCase()}
                      </div>
                      <div className="text-xs truncate font-medium">
                        {p.displayName}
                      </div>
                      {p.votes > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-xs flex items-center justify-center font-bold">
                          {p.votes}
                        </div>
                      )}
                      {p.userId === user?.id && (
                        <div className="text-xs text-purple-400 mt-0.5">
                          Sen
                        </div>
                      )}
                    </motion.button>
                  ))}
              </div>
            </div>

            {/* Vote result */}
            <AnimatePresence>
              {eliminatedPlayer && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-orange-500/30 bg-orange-900/10 p-5 text-center"
                >
                  <div className="text-4xl mb-2">⚖️</div>
                  <p className="font-bold text-orange-300">
                    {eliminatedPlayer.displayName} elendi!
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Rolü:{" "}
                    {ROLE_CONFIG[eliminatedPlayer.role as VampireRole]?.icon}{" "}
                    {ROLE_CONFIG[eliminatedPlayer.role as VampireRole]?.name ||
                      eliminatedPlayer.role}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right panel - Chat */}
          <div
            className="flex flex-col rounded-2xl border border-white/8 bg-white/2 overflow-hidden"
            style={{ height: "75vh" }}
          >
            <div className="px-4 py-3 border-b border-white/5">
              <span className="text-sm font-semibold">
                💬 {isNight ? "Sessizlik..." : "Sohbet"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* Narrator history */}
              {narratorMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="text-xs text-gray-500 italic px-2 py-1 rounded-lg bg-white/2 border border-white/3"
                >
                  🎭 {msg.message}
                </div>
              ))}
              {/* Chat messages */}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.userId === user?.id ? "flex-row-reverse" : ""}`}
                >
                  <div className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center text-xs flex-shrink-0">
                    {(msg.displayName || "?")[0].toUpperCase()}
                  </div>
                  <div
                    className={`max-w-[80%] ${msg.userId === user?.id ? "items-end" : "items-start"} flex flex-col gap-0.5`}
                  >
                    <span className="text-xs text-gray-600">
                      {msg.displayName}
                    </span>
                    <div
                      className={`px-3 py-1.5 rounded-xl text-xs ${msg.userId === user?.id ? "bg-purple-600/30 text-purple-100" : "bg-white/5 text-gray-200"}`}
                    >
                      {msg.message}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {isDiscussion ? (
              <form
                onSubmit={handleChat}
                className="p-3 border-t border-white/5 flex gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Düşüncelerini paylaş..."
                  maxLength={300}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-xs transition-all"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs transition-all"
                >
                  ↑
                </button>
              </form>
            ) : (
              <div className="p-3 border-t border-white/5 text-center text-xs text-gray-600">
                {isNight
                  ? "🌙 Gece boyunca sohbet kapalı"
                  : "Tartışma bekleniyor..."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
