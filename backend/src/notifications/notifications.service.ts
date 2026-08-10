import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { NotificationType } from "@prisma/client";
import { EventEmitter2 } from "@nestjs/event-emitter";

export interface CreateNotificationDto {
  recipientId: string;
  senderId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        recipientId: dto.recipientId,
        senderId: dto.senderId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: (dto.data || {}) as any,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatar: true } },
          },
        },
      },
    });

    this.eventEmitter.emit("notification.created", {
      userId: dto.recipientId,
      notification,
    });

    return notification;
  }

  async getNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { recipientId: userId },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              profile: { select: { displayName: true, avatar: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { recipientId: userId } }),
      this.prisma.notification.count({
        where: { recipientId: userId, isRead: false },
      }),
    ]);

    return { notifications, total, unreadCount, page, limit };
  }

  async markAsRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, recipientId: userId },
      data: { isRead: true },
    });
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { recipientId: userId, isRead: false },
    });
  }

  async deleteOldNotifications(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await this.prisma.notification.deleteMany({
      where: { createdAt: { lt: thirtyDaysAgo }, isRead: true },
    });
  }
}
