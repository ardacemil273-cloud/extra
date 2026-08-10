import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { IsString, MaxLength, IsOptional } from "class-validator";

export class UpdateProfileDto {
  @IsString()
  @MaxLength(50)
  @IsOptional()
  displayName?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}

const AVATAR_OPTIONS = [
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
  "guest",
];

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            isOnline: true,
            lastSeen: true,
            isGuest: true,
            statistics: true,
            achievements: {
              include: { achievement: true },
              orderBy: { unlockedAt: "desc" },
              take: 5,
            },
          },
        },
      },
    });

    if (!profile) throw new NotFoundException("Profil bulunamadı");
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.avatar && !AVATAR_OPTIONS.includes(dto.avatar)) {
      throw new BadRequestException("Geçersiz avatar seçimi");
    }

    return this.prisma.profile.update({
      where: { userId },
      data: {
        displayName: dto.displayName,
        bio: dto.bio,
        country: dto.country,
        avatar: dto.avatar,
      },
    });
  }

  async getAchievements(userId: string) {
    const all = await this.prisma.achievement.findMany({
      orderBy: [{ rarity: "desc" }, { name: "asc" }],
    });

    const unlocked = await this.prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true, unlockedAt: true },
    });

    const unlockedMap = new Map(
      unlocked.map((u) => [u.achievementId, u.unlockedAt]),
    );

    return all.map((ach) => ({
      ...ach,
      unlocked: unlockedMap.has(ach.id),
      unlockedAt: unlockedMap.get(ach.id) || null,
    }));
  }

  async unlockAchievement(userId: string, key: string): Promise<boolean> {
    const achievement = await this.prisma.achievement.findUnique({
      where: { key },
    });
    if (!achievement) return false;

    const existing = await this.prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId, achievementId: achievement.id },
      },
    });

    if (existing) return false;

    await this.prisma.userAchievement.create({
      data: { userId, achievementId: achievement.id },
    });

    return true;
  }

  getAvatarOptions() {
    return AVATAR_OPTIONS;
  }

  async getGameHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [history, total] = await Promise.all([
      this.prisma.gameHistory.findMany({
        where: { userId },
        orderBy: { playedAt: "desc" },
        skip,
        take: limit,
        include: {
          match: {
            select: {
              id: true,
              gameType: true,
              duration: true,
              winnerTeam: true,
              endedAt: true,
            },
          },
        },
      }),
      this.prisma.gameHistory.count({ where: { userId } }),
    ]);
    return { history, total, page, limit };
  }
}
