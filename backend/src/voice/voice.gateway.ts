import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';

interface VoiceState {
  userId: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  pushToTalk: boolean;
}

@WebSocketGateway({
  namespace: '/voice',
  cors: { origin: '*', credentials: true },
})
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(VoiceGateway.name);
  private roomVoiceStates: Map<string, Map<string, VoiceState>> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('auth.jwtSecret'),
      });

      client.data.userId = payload.sub;
      client.data.username = payload.username;
      this.logger.log(`Voice socket connected: ${payload.username}`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    for (const [roomId, states] of this.roomVoiceStates.entries()) {
      if (states.has(userId)) {
        states.delete(userId);
        client.to(`voice:${roomId}`).emit('voice:peer-left', { userId });
        if (states.size === 0) this.roomVoiceStates.delete(roomId);
      }
    }
  }

  @SubscribeMessage('voice:join')
  handleVoiceJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const userId = client.data.userId;
    if (!userId) return;

    client.join(`voice:${data.roomId}`);

    if (!this.roomVoiceStates.has(data.roomId)) {
      this.roomVoiceStates.set(data.roomId, new Map());
    }

    const voiceState: VoiceState = {
      userId,
      isMuted: false,
      isDeafened: false,
      isSpeaking: false,
      pushToTalk: false,
    };

    this.roomVoiceStates.get(data.roomId).set(userId, voiceState);

    const existingPeers = Array.from(this.roomVoiceStates.get(data.roomId).values()).filter(
      (s) => s.userId !== userId,
    );

    client.emit('voice:existing-peers', { peers: existingPeers });
    client.to(`voice:${data.roomId}`).emit('voice:peer-joined', { userId, username: client.data.username, voiceState });

    this.broadcastVoiceStates(data.roomId);
  }

  @SubscribeMessage('voice:leave')
  handleVoiceLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const userId = client.data.userId;
    if (!userId) return;

    client.leave(`voice:${data.roomId}`);

    const states = this.roomVoiceStates.get(data.roomId);
    if (states) {
      states.delete(userId);
      if (states.size === 0) this.roomVoiceStates.delete(data.roomId);
    }

    client.to(`voice:${data.roomId}`).emit('voice:peer-left', { userId });
    this.broadcastVoiceStates(data.roomId);
  }

  // WebRTC signaling
  @SubscribeMessage('voice:offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetUserId: string; offer: RTCSessionDescriptionInit },
  ) {
    const targetSocketKey = `user:game-socket:${data.targetUserId}`;
    this.redis.get(targetSocketKey).then((socketId) => {
      if (socketId) {
        this.server.to(socketId).emit('voice:offer', {
          fromUserId: client.data.userId,
          offer: data.offer,
        });
      }
    });
  }

  @SubscribeMessage('voice:answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetUserId: string; answer: RTCSessionDescriptionInit },
  ) {
    this.redis.get(`user:game-socket:${data.targetUserId}`).then((socketId) => {
      if (socketId) {
        this.server.to(socketId).emit('voice:answer', {
          fromUserId: client.data.userId,
          answer: data.answer,
        });
      }
    });
  }

  @SubscribeMessage('voice:ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetUserId: string; candidate: RTCIceCandidateInit },
  ) {
    this.redis.get(`user:game-socket:${data.targetUserId}`).then((socketId) => {
      if (socketId) {
        this.server.to(socketId).emit('voice:ice-candidate', {
          fromUserId: client.data.userId,
          candidate: data.candidate,
        });
      }
    });
  }

  @SubscribeMessage('voice:mute')
  handleMute(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isMuted: boolean },
  ) {
    const userId = client.data.userId;
    const states = this.roomVoiceStates.get(data.roomId);
    if (states?.has(userId)) {
      states.get(userId).isMuted = data.isMuted;
    }
    client.to(`voice:${data.roomId}`).emit('voice:peer-muted', { userId, isMuted: data.isMuted });
    this.broadcastVoiceStates(data.roomId);
  }

  @SubscribeMessage('voice:deafen')
  handleDeafen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isDeafened: boolean },
  ) {
    const userId = client.data.userId;
    const states = this.roomVoiceStates.get(data.roomId);
    if (states?.has(userId)) {
      states.get(userId).isDeafened = data.isDeafened;
    }
    client.to(`voice:${data.roomId}`).emit('voice:peer-deafened', { userId, isDeafened: data.isDeafened });
    this.broadcastVoiceStates(data.roomId);
  }

  @SubscribeMessage('voice:speaking')
  handleSpeaking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isSpeaking: boolean },
  ) {
    const userId = client.data.userId;
    const states = this.roomVoiceStates.get(data.roomId);
    if (states?.has(userId)) {
      states.get(userId).isSpeaking = data.isSpeaking;
    }
    client.to(`voice:${data.roomId}`).emit('voice:peer-speaking', { userId, isSpeaking: data.isSpeaking });
  }

  @SubscribeMessage('voice:push-to-talk')
  handlePushToTalk(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isActive: boolean },
  ) {
    const userId = client.data.userId;
    const states = this.roomVoiceStates.get(data.roomId);
    if (states?.has(userId)) {
      states.get(userId).pushToTalk = data.isActive;
      states.get(userId).isSpeaking = data.isActive;
    }
    client.to(`voice:${data.roomId}`).emit('voice:peer-speaking', {
      userId,
      isSpeaking: data.isActive,
    });
  }

  private broadcastVoiceStates(roomId: string): void {
    const states = this.roomVoiceStates.get(roomId);
    if (!states) return;
    this.server.to(`voice:${roomId}`).emit('voice:states', {
      states: Array.from(states.values()),
    });
  }
}
