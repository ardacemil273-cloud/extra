import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/tr";

dayjs.extend(relativeTime);
dayjs.locale("tr");

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: string | Date): string {
  return dayjs(date).fromNow();
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function calculateXpForLevel(level: number): number {
  return level * level * 100;
}

export function calculateLevelProgress(xp: number): {
  level: number;
  currentXp: number;
  requiredXp: number;
  progress: number;
} {
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const currentLevelXp = (level - 1) * (level - 1) * 100;
  const nextLevelXp = level * level * 100;
  const currentXp = xp - currentLevelXp;
  const requiredXp = nextLevelXp - currentLevelXp;
  const progress = (currentXp / requiredXp) * 100;
  return {
    level,
    currentXp,
    requiredXp,
    progress: Math.min(100, Math.max(0, progress)),
  };
}

export function getAvatarUrl(avatar: string): string {
  if (avatar?.startsWith("http")) return avatar;
  const avatarMap: Record<string, string> = {
    default: "/avatars/default.svg",
    warrior: "/avatars/warrior.svg",
    mage: "/avatars/mage.svg",
    rogue: "/avatars/rogue.svg",
    vampire: "/avatars/vampire.svg",
    werewolf: "/avatars/werewolf.svg",
    detective: "/avatars/detective.svg",
    doctor: "/avatars/doctor.svg",
    hunter: "/avatars/hunter.svg",
    ghost: "/avatars/ghost.svg",
    guest: "/avatars/guest.svg",
  };
  return avatarMap[avatar] || avatarMap.default;
}

export function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: "#9ca3af",
    rare: "#3b82f6",
    epic: "#a855f7",
    legendary: "#f59e0b",
  };
  return colors[rarity] || colors.common;
}

export function getRarityLabel(rarity: string): string {
  const labels: Record<string, string> = {
    common: "Yaygın",
    rare: "Nadir",
    epic: "Destansı",
    legendary: "Efsanevi",
  };
  return labels[rarity] || rarity;
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function getWinRateColor(rate: number): string {
  if (rate >= 0.6) return "text-green-400";
  if (rate >= 0.4) return "text-yellow-400";
  return "text-red-400";
}
