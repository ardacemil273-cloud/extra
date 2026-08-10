import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

const USER_SELECT = {
  id: true,
  username: true,
  isOnline: true,
  lastSeen: true,
  isGuest: true,
  provider: true,
  profile: true,
  statistics: true,
  _count: {
    select: { sentFriendRequests: true, receivedFriendRequests: true },
  },
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException("Kullanıcı bulunamadı");
    return user;
  }

  async findByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException("Kullanıcı bulunamadı");
    return user;
  }

  async searchUsers(query: string, currentUserId: string) {
    return this.prisma.user.findMany({
      where: {
        username: { contains: query, mode: "insensitive" },
        id: { not: currentUserId },
        isGuest: false,
      },
      select: {
        id: true,
        username: true,
        isOnline: true,
        profile: { select: { displayName: true, avatar: true, level: true } },
      },
      take: 20,
    });
  }

  async getLeaderboard(sort: "wins" | "level" = "wins", limit = 10) {
    const users = await this.prisma.user.findMany({
      where: { isGuest: false },
      select: {
        id: true,
        username: true,
        profile: {
          select: { displayName: true, avatar: true, level: true, xp: true },
        },
        statistics: {
          select: { gamesWon: true, gamesPlayed: true, winRate: true },
        },
      },
      take: limit * 3, // filter sonrası yeterli olsun
    });
    const sorted = users
      .filter((u) => u.statistics)
      .sort((a, b) =>
        sort === "wins"
          ? (b.statistics?.gamesWon || 0) - (a.statistics?.gamesWon || 0)
          : (b.profile?.level || 0) - (a.profile?.level || 0),
      )
      .slice(0, limit);
    return sorted;
  }

  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isOnline, lastSeen: new Date() },
    });
  }

  async addXp(
    userId: string,
    xp: number,
  ): Promise<{ newLevel: number; leveledUp: boolean }> {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException("Profil bulunamadı");

    const newXp = profile.xp + xp;
    const newLevel = this.calculateLevel(newXp);
    const leveledUp = newLevel > profile.level;

    await this.prisma.profile.update({
      where: { userId },
      data: { xp: newXp, level: newLevel },
    });

    return { newLevel, leveledUp };
  }

  calculateLevel(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  async updateStatistics(
    userId: string,
    data: { won: boolean; playTime: number },
  ): Promise<void> {
    const stats = await this.prisma.statistics.findUnique({
      where: { userId },
    });
    if (!stats) return;

    const gamesPlayed = stats.gamesPlayed + 1;
    const gamesWon = data.won ? stats.gamesWon + 1 : stats.gamesWon;
    const totalPlayTime = stats.totalPlayTime + data.playTime;
    const winRate = gamesPlayed > 0 ? gamesWon / gamesPlayed : 0;

    await this.prisma.statistics.update({
      where: { userId },
      data: {
        gamesPlayed,
        gamesWon,
        gamesLost: data.won ? stats.gamesLost : stats.gamesLost + 1,
        totalPlayTime,
        winRate,
      },
    });
  }
}
