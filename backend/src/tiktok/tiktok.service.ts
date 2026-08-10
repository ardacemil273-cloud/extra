import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class TiktokService {
  private readonly logger = new Logger(TiktokService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  // Simulate receiving events from TikTok
  // In a real scenario, this would connect to TikTok API or a webhook
  simulateEvent(type: string, data: any) {
    this.logger.log(`Simulating TikTok event: ${type}, data: ${JSON.stringify(data)}`);
    // Emit an internal event that can be picked up by other services (e.g., game engine)
    this.eventEmitter.emit(`tiktok.event.${type}`, data);
  }

  // Placeholder methods for common TikTok events
  simulateFollow(userId: string) {
    this.simulateEvent('follow', { userId, timestamp: Date.now() });
  }

  simulateLike(userId: string, count: number = 1) {
    this.simulateEvent('like', { userId, count, timestamp: Date.now() });
  }

  simulateGift(userId: string, giftId: string, giftName: string, value: number) {
    this.simulateEvent('gift', { userId, giftId, giftName, value, timestamp: Date.now() });
  }

  simulateComment(userId: string, comment: string) {
    this.simulateEvent('comment', { userId, comment, timestamp: Date.now() });
  }

  simulateViewerJoin(userId: string) {
    this.simulateEvent('viewer.join', { userId, timestamp: Date.now() });
  }
}
