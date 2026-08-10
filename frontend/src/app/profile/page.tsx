"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth.store";
import {
  calculateLevelProgress,
  getRarityColor,
  getRarityLabel,
} from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

const AVATARS = [
  "default",
  "warrior",
  "mage",
  "rogue",
  "vampire",
  "werewolf",
  "detective",
  "doctor",
  "hunter",
  "ghost",
];
const AVATAR_ICONS: Record<string, string> = {
  default: "🧑",
  warrior: "⚔️",
  mage: "🔮",
  rogue: "🗡️",
  vampire: "🧛",
  werewolf: "🐺",
  detective: "🔍",
  doctor: "💉",
  hunter: "🏹",
  ghost: "👻",
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loadCurrentUser } = useAuthStore();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    avatar: "default",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    loadAchievements();
    if (user?.profile)
      setForm({
        displayName: user.profile.displayName,
        bio: user.profile.bio || "",
        avatar: user.profile.avatar || "default",
      });
  }, [isAuthenticated]);

  const loadAchievements = async () => {
    try {
      const { data } = await api.get("/profile/me/achievements");
      setAchievements(data.data || data);
    } catch {}
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch("/profile/me", form);
      await loadCurrentUser();
      setEditing(false);
      toast.success("Profil güncellendi!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Güncelleme başarısız");
    } finally {
      setSaving(false);
    }
  };

  const profile = user?.profile;
  const stats = user?.statistics;
  const levelInfo = calculateLevelProgress(profile?.xp || 0);
  const unlocked = achievements.filter((a) => a.unlocked);

  return (
    <div className="min-h-screen bg-[#080b14] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/3 w-80 h-80 bg-purple-600/6 rounded-full blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#080b14]/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
            <h1 className="font-bold">Profil</h1>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${editing ? "bg-white/10 text-gray-300" : "bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30"}`}
          >
            {editing ? "İptal" : "✏️ Düzenle"}
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Profile card */}
        <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 border-2 border-purple-500/30 flex items-center justify-center text-4xl">
                {AVATAR_ICONS[profile?.avatar || "default"] || "🧑"}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-purple-600 border-2 border-[#080b14] flex items-center justify-center text-xs font-black">
                {levelInfo.level}
              </div>
            </div>

            <div className="flex-1">
              {editing ? (
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) =>
                    setForm({ ...form, displayName: e.target.value })
                  }
                  className="text-2xl font-black bg-white/5 border border-white/10 rounded-xl px-3 py-2 w-full focus:outline-none focus:border-purple-500 mb-2"
                  maxLength={50}
                />
              ) : (
                <h2 className="text-2xl font-black">
                  {profile?.displayName || user?.username}
                </h2>
              )}
              <p className="text-gray-400 text-sm mb-1">@{user?.username}</p>
              {editing ? (
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Kendin hakkında bir şeyler yaz..."
                  className="w-full mt-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none h-20"
                  maxLength={200}
                />
              ) : (
                profile?.bio && (
                  <p className="text-sm text-gray-400 mt-2">{profile.bio}</p>
                )
              )}

              {/* XP Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-purple-400 font-semibold">
                    Seviye {levelInfo.level}
                  </span>
                  <span className="text-gray-500">
                    {levelInfo.currentXp} / {levelInfo.requiredXp} XP
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${levelInfo.progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Avatar picker */}
          {editing && (
            <div className="mt-5 pt-5 border-t border-white/5">
              <p className="text-sm font-medium text-gray-400 mb-3">
                Avatar Seç
              </p>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    onClick={() => setForm({ ...form, avatar: av })}
                    className={`w-12 h-12 rounded-xl border flex items-center justify-center text-2xl transition-all ${form.avatar === av ? "border-purple-500 bg-purple-500/20" : "border-white/8 bg-white/3 hover:border-white/20"}`}
                  >
                    {AVATAR_ICONS[av]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {editing && (
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 disabled:opacity-50 transition-all active:scale-95"
              >
                {saving ? "Kaydediliyor..." : "✓ Kaydet"}
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
            <h3 className="font-bold mb-4">İstatistikler</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Toplam Oyun", value: stats.gamesPlayed, icon: "🎮" },
                { label: "Kazanılan", value: stats.gamesWon, icon: "🏆" },
                { label: "Kaybedilen", value: stats.gamesLost, icon: "💀" },
                {
                  label: "Kazanma %",
                  value: `${Math.round((stats.winRate || 0) * 100)}%`,
                  icon: "📊",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-white/5 bg-white/2 p-4 text-center"
                >
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="font-black text-xl">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Başarımlar</h3>
            <span className="text-sm text-gray-500">
              {unlocked.length}/{achievements.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.map((ach, i) => (
              <motion.div
                key={ach.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${ach.unlocked ? "border-white/10 bg-white/3" : "border-white/3 bg-white/1 opacity-40"}`}
              >
                <div className="text-2xl w-10 text-center">{ach.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">
                      {ach.name}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full border"
                      style={{
                        color: getRarityColor(ach.rarity),
                        borderColor: getRarityColor(ach.rarity) + "40",
                        backgroundColor: getRarityColor(ach.rarity) + "15",
                      }}
                    >
                      {getRarityLabel(ach.rarity)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {ach.description}
                  </p>
                </div>
                {ach.unlocked && (
                  <span className="text-green-400 text-sm">✓</span>
                )}
                <span className="text-xs text-yellow-500/70">
                  +{ach.xpReward}xp
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
