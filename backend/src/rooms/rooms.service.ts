import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomStatus } from '@prisma/client';
import { nanoid } from 'nanoid';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createRoom(hostId: string, dto: CreateRoomDto) {
    const existing = await this.prisma.roomPlayer.findFirst({
      where: { userId: hostId, room: { status: RoomStatus.WAITING } },
    });

    if (existing) {
      throw new ConflictException('Zaten bir odadasınız. Önce mevcut odadan çıkın.');
    }

    const code = this.generateRoomCode();
    const hashedPassword = dto.password ? await bcrypt.hash(dto.password, 10) : null;

    const room = await this.prisma.room.create({
      data: {
        code,
        hostId,
        name: dto.name,
        maxPlayers: dto.maxPlayers || 8,
        isPrivate: dto.isPrivate || false,
        password: hashedPassword,
        gameType: dto.gameType || null,
        players: {
          create: { userId: hostId, isHost: true, isReady: true },
        },
      },
      include: this.getRoomInclude(),
    });

    await this.redis.setJson(`room:${room.id}`, { id: room.id, code: room.code }, 3600);
    return room;
  }

  async joinRoom(userId: string, codeOrId: string, password?: string) {
    const room = await this.prisma.room.findFirst({
      where: { OR: [{ code: codeOrId }, { id: codeOrId }] },
      include: this.getRoomInclude(),
    });

    if (!room) throw new NotFoundException('Oda bulunamadı');
    if (room.status !== RoomStatus.WAITING) throw new ConflictException('Oda şu anda oyun oynuyor');

    if (room.players.length >= room.maxPlayers) {
      throw new ConflictException('Oda dolu');
    }

    const alreadyIn = room.players.find((p) => p.userId === userId);
    if (alreadyIn) return room;

    const existingRoom = await this.prisma.roomPlayer.findFirst({
      where: { userId, room: { status: RoomStatus.WAITING } },
    });
    if (existingRoom) throw new ConflictException('Zaten başka bir odadasınız');

    if (room.password) {
      if (!password) throw new ForbiddenException('Bu oda şifre gerektiriyor');
      const valid = await bcrypt.compare(password, room.password);
      if (!valid) throw new ForbiddenException('Yanlış oda şifresi');
    }

    await this.prisma.roomPlayer.create({
      data: { roomId: room.id, userId, isReady: false },
    });

    return this.prisma.room.findUnique({
      where: { id: room.id },
      include: this.getRoomInclude(),
    });
  }

  async leaveRoom(userId: string, roomId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { players: true },
    });

    if (!room) throw new NotFoundException('Oda bulunamadı');

    await this.prisma.roomPlayer.deleteMany({
      where: { roomId, userId },
    });

    const remaining = room.players.filter((p) => p.userId !== userId);

    if (remaining.length === 0) {
      await this.prisma.room.update({
        where: { id: roomId },
        data: { status: RoomStatus.FINISHED },
      });
      return { closed: true };
    }

    if (room.hostId === userId) {
      const newHost = remaining[0];
      await this.prisma.room.update({
        where: { id: roomId },
        data: { hostId: newHost.userId },
      });
      await this.prisma.roomPlayer.update({
        where: { id: newHost.id },
        data: { isHost: true },
      });
    }

    return { closed: false };
  }

  async setReady(userId: string, roomId: string, isReady: boolean) {
    await this.prisma.roomPlayer.updateMany({
      where: { roomId, userId },
      data: { isReady },
    });

    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { players: true },
    });

    const allReady = room.players.every((p) => p.isReady);
    return { allReady };
  }

  async kickPlayer(hostId: string, roomId: string, targetUserId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Oda bulunamadı');
    if (room.hostId !== hostId) throw new ForbiddenException('Sadece host oyuncu atabilir');
    if (targetUserId === hostId) throw new BadRequestException('Kendinizi atamazsınız');

    await this.prisma.roomPlayer.deleteMany({ where: { roomId, userId: targetUserId } });
    return { kicked: true };
  }

  async selectGame(hostId: string, roomId: string, gameType: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Oda bulunamadı');
    if (room.hostId !== hostId) throw new ForbiddenException('Sadece host oyun seçebilir');

    return this.prisma.room.update({
      where: { id: roomId },
      data: { gameType },
      include: this.getRoomInclude(),
    });
  }

  async getRoomByCode(code: string) {
    const room = await this.prisma.room.findUnique({
      where: { code },
      include: this.getRoomInclude(),
    });
    if (!room) throw new NotFoundException('Oda bulunamadı');
    return room;
  }

  async getRoomById(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: this.getRoomInclude(),
    });
    if (!room) throw new NotFoundException('Oda bulunamadı');
    return room;
  }

  async getPublicRooms() {
    return this.prisma.room.findMany({
      where: { isPrivate: false, status: RoomStatus.WAITING },
      include: this.getRoomInclude(),
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  private getRoomInclude() {
    return {
      players: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              isOnline: true,
              profile: { select: { displayName: true, avatar: true, level: true } },
            },
          },
        },
      },
      host: {
        select: { id: true, username: true, profile: { select: { displayName: true, avatar: true } } },
      },
    };
  }
}
