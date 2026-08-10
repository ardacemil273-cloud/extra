"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function JoinRoomPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post("/rooms/join", {
        codeOrId: code.toUpperCase(),
        password: password || undefined,
      });
      const room = data.data || data;
      toast.success("Odaya katıldın!");
      router.push(`/room/${room.id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "";
      if (
        msg.toLowerCase().includes("şifre") ||
        msg.toLowerCase().includes("password")
      ) {
        setNeedsPassword(true);
        toast.error("Bu oda şifre gerektiriyor");
      } else {
        toast.error(msg || "Odaya katılamadın");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b14] text-white flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-fuchsia-600/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
          >
            <svg
              className="w-4 h-4"
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
          </Link>
          <h1 className="text-2xl font-black">Odaya Katıl</h1>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/3 p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🔗</div>
            <p className="text-gray-400 text-sm">
              Arkadaşından aldığın 6 haneli kodu gir
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <input
                type="text"
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                  )
                }
                placeholder="ABC123"
                maxLength={6}
                className="w-full px-6 py-5 rounded-2xl bg-white/5 border-2 border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-3xl font-black text-center tracking-[0.4em] transition-all"
                autoFocus
              />
            </div>

            {needsPassword && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Oda şifresi"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
                  autoFocus
                />
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || code.length < 3}
              className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 disabled:opacity-40 transition-all active:scale-95 shadow-lg shadow-purple-500/20"
            >
              {loading ? "Aranıyor..." : "→ Katıl"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <p className="text-sm text-gray-500 mb-3">veya yeni oda oluştur</p>
            <Link
              href="/room/create"
              className="text-sm text-purple-400 hover:text-purple-300 font-medium"
            >
              Oda Oluştur →
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
