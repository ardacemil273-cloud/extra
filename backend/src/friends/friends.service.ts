import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { FriendStatus, NotificationType } from "@prisma/client";

const FRIEND_USER_SELECT = {
  id: true,
  username: true,
  isOnline: true,
  lastSeen: true,
  profile: { select: { displayName: true, avatar: true, level: true } },
};

@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async sendFriendRequest(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) {
      throw new BadRequestException(
        "Kendinize arkadaşlık isteği gönderemezsiniz",
      );
    }

    const addressee = await this.prisma.user.findUnique({
      where: { id: addresseeId },
    });
    if (!addressee) throw new NotFoundException("Kullanıcı bulunamadı");
    if (addressee.isGuest)
      throw new BadRequestException("Misafir kullanıcılara istek gönderilemez");

    const existing = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === FriendStatus.ACCEPTED)
        throw new ConflictException("Zaten arkadaşsınız");
      if (existing.status === FriendStatus.PENDING)
        throw new ConflictException("Zaten bekleyen bir istek var");
      if (existing.status === FriendStatus.BLOCKED)
        throw new ForbiddenException("Bu kullanıcıyla arkadaşlık kurulamaz");
    }

    const request = await this.prisma.friend.create({
      data: { requesterId, addresseeId, status: FriendStatus.PENDING },
    });

    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      include: { profile: true },
    });

    await this.notifications.create({
      recipientId: addresseeId,
      senderId: requesterId,
      type: NotificationType.FRIEND_REQUEST,
      title: "Arkadaşlık İsteği",
      message: `${requester.profile?.displayName || requester.username} size arkadaşlık isteği gönderdi`,
      data: { friendRequestId: request.id, requesterId },
    });

    return request;
  }

  async acceptFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friend.findUnique({
      where: { id: requestId },
    });

    if (!request || request.addresseeId !== userId) {
      throw new NotFoundException("Arkadaşlık isteği bulunamadı");
    }

    if (request.status !== FriendStatus.PENDING) {
      throw new BadRequestException("Bu istek artık geçerli değil");
    }

    const updated = await this.prisma.friend.update({
      where: { id: requestId },
      data: { status: FriendStatus.ACCEPTED },
    });

    const accepter = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    await this.notifications.create({
      recipientId: request.requesterId,
      senderId: userId,
      type: NotificationType.FRIEND_ACCEPTED,
      title: "Arkadaşlık Kabul Edildi",
      message: `${accepter.profile?.displayName || accepter.username} arkadaşlık isteğinizi kabul etti`,
      data: { userId },
    });

    return updated;
  }

  async declineFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friend.findUnique({
      where: { id: requestId },
    });

    if (!request || request.addresseeId !== userId) {
      throw new NotFoundException("Arkadaşlık isteği bulunamadı");
    }

    await this.prisma.friend.delete({ where: { id: requestId } });
    return { message: "Arkadaşlık isteği reddedildi" };
  }

  async removeFriend(userId: string, friendId: string) {
    const friendship = await this.prisma.friend.findFirst({
      where: {
        status: FriendStatus.ACCEPTED,
        OR: [
          { requesterId: userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: userId },
        ],
      },
    });

    if (!friendship) throw new NotFoundException("Arkadaşlık bulunamadı");

    await this.prisma.friend.delete({ where: { id: friendship.id } });
    return { message: "Arkadaşlıktan çıkarıldı" };
  }

  async getFriends(userId: string) {
    const friendships = await this.prisma.friend.findMany({
      where: {
        status: FriendStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: FRIEND_USER_SELECT },
        addressee: { select: FRIEND_USER_SELECT },
      },
    });

    return friendships.map((f) => ({
      friendshipId: f.id,
      friend: f.requesterId === userId ? f.addressee : f.requester,
      since: f.updatedAt,
    }));
  }

  async getPendingRequests(userId: string) {
    return this.prisma.friend.findMany({
      where: { addresseeId: userId, status: FriendStatus.PENDING },
      include: {
        requester: { select: FRIEND_USER_SELECT },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getSentRequests(userId: string) {
    return this.prisma.friend.findMany({
      where: { requesterId: userId, status: FriendStatus.PENDING },
      include: {
        addressee: { select: FRIEND_USER_SELECT },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getFriendStatus(userId: string, otherUserId: string) {
    const friendship = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: otherUserId },
          { requesterId: otherUserId, addresseeId: userId },
        ],
      },
    });

    if (!friendship) return { status: "NONE" };
    return {
      status: friendship.status,
      requestId: friendship.id,
      isRequester: friendship.requesterId === userId,
    };
  }
}
